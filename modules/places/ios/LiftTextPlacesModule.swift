import CoreLocation
import ExpoModulesCore
import MapKit

// Find food near you, the on-phone half (services/finder.ts): where the user is, and which food places
// Apple Maps knows around a point. Everything here runs on the iPhone; the coordinates it returns are
// used on the phone to pick and sort places and are never sent to our server (the Worker refuses them).

// One approximate fix: asks for When In Use permission the first time (the Info.plist marks the app as
// wanting reduced accuracy, so the system prompt offers approximate location), then one reading.
private class OneShotLocation: NSObject, CLLocationManagerDelegate {
  private let manager = CLLocationManager()
  private var continuation: CheckedContinuation<CLLocation?, Never>?

  override init() {
    super.init()
    manager.delegate = self
    manager.desiredAccuracy = kCLLocationAccuracyReduced
  }

  func read() async -> CLLocation? {
    await withCheckedContinuation { continuation in
      self.continuation = continuation
      switch manager.authorizationStatus {
      case .notDetermined: manager.requestWhenInUseAuthorization()
      case .authorizedWhenInUse, .authorizedAlways: manager.requestLocation()
      default: finish(nil)
      }
    }
  }

  private func finish(_ location: CLLocation?) {
    continuation?.resume(returning: location)
    continuation = nil
  }

  func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
    guard continuation != nil else { return }
    switch manager.authorizationStatus {
    case .notDetermined: break
    case .authorizedWhenInUse, .authorizedAlways: manager.requestLocation()
    default: finish(nil)
    }
  }

  func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
    finish(locations.last)
  }

  func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
    finish(nil)
  }
}

public class LiftTextPlacesModule: Module {
  private var locator: OneShotLocation?

  public func definition() -> ModuleDefinition {
    Name("LiftTextPlaces")

    // Where the iPhone is, to about a kilometre, or null when the user said no or there is no fix yet
    AsyncFunction("currentLocation") { () async -> [String: Double]? in
      let locator = OneShotLocation()
      self.locator = locator // kept alive until the reading lands
      guard let location = await locator.read() else { return nil }
      return ["lat": location.coordinate.latitude, "lon": location.coordinate.longitude]
    }

    // Whether live location is allowed right now ("notDetermined", "allowed", "denied")
    Function("locationPermission") { () -> String in
      switch CLLocationManager().authorizationStatus {
      case .notDetermined: return "notDetermined"
      case .authorizedWhenInUse, .authorizedAlways: return "allowed"
      default: return "denied"
      }
    }

    // A typed address or area ("E 7th St and Avenue A, New York", "East Village, NYC") as a point, on
    // the phone through Apple's geocoder; null when it finds nothing
    AsyncFunction("geocode") { (text: String) async throws -> [String: Any]? in
      let marks = try await CLGeocoder().geocodeAddressString(text)
      guard let mark = marks.first, let location = mark.location else { return nil }
      let name = [mark.name, mark.locality].compactMap { $0 }.joined(separator: ", ")
      return ["lat": location.coordinate.latitude, "lon": location.coordinate.longitude, "name": name]
    }

    // Food places within `radius` metres of a point, nearest first: name, Apple's category and the distance
    AsyncFunction("nearby") { (lat: Double, lon: Double, radius: Double) async throws -> [[String: Any]] in
      let center = CLLocationCoordinate2D(latitude: lat, longitude: lon)
      let request = MKLocalPointsOfInterestRequest(center: center, radius: min(radius, MKLocalPointsOfInterestRequest.maxRadius))
      request.pointOfInterestFilter = MKPointOfInterestFilter(including: [.restaurant, .cafe, .bakery, .foodMarket])
      let response = try await MKLocalSearch(request: request).start()
      let origin = CLLocation(latitude: lat, longitude: lon)
      return response.mapItems
        .compactMap { item -> [String: Any]? in
          guard let name = item.name, let location = item.placemark.location else { return nil }
          return [
            "name": name,
            "category": item.pointOfInterestCategory?.rawValue ?? "",
            "distanceM": location.distance(from: origin),
            "lat": location.coordinate.latitude,
            "lon": location.coordinate.longitude,
          ]
        }
        .sorted { ($0["distanceM"] as! Double) < ($1["distanceM"] as! Double) }
    }
  }
}
