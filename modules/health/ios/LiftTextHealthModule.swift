import ExpoModulesCore
import HealthKit

// Apple Health for services/health.ts: reads workouts and body weight to show on the phone, and saves the
// workouts you log once you turn that on. Times cross the bridge as milliseconds since 1970.
public class LiftTextHealthModule: Module {
  public func definition() -> ModuleDefinition {
    let store = HKHealthStore()

    Name("LiftTextHealth")

    Function("isAvailable") { () -> Bool in
      return HKHealthStore.isHealthDataAvailable()
    }

    // Apple's Health sheet: read workouts and body weight, and with `write` save workouts too. iOS never
    // says whether reading was allowed (a query just finds nothing); it does say for saving.
    AsyncFunction("requestAccess") { (write: Bool) async throws -> Bool in
      let read: Set<HKObjectType> = [HKObjectType.workoutType(), HKQuantityType(.bodyMass)]
      let share: Set<HKSampleType> = write ? [HKObjectType.workoutType()] : []
      try await store.requestAuthorization(toShare: share, read: read)
      return store.authorizationStatus(for: HKObjectType.workoutType()) == .sharingAuthorized
    }

    Function("canSaveWorkouts") { () -> Bool in
      return store.authorizationStatus(for: HKObjectType.workoutType()) == .sharingAuthorized
    }

    // Workouts other apps and devices saved since `since`, newest first; LiftText's own are left out
    AsyncFunction("workouts") { (since: Double) async throws -> [[String: Any]] in
      let query = HKSampleQueryDescriptor(
        predicates: [.workout(HKQuery.predicateForSamples(withStart: Date(timeIntervalSince1970: since / 1000), end: nil))],
        sortDescriptors: [SortDescriptor(\.endDate, order: .reverse)],
        limit: 100
      )
      let own = Bundle.main.bundleIdentifier
      return try await query.result(for: store)
        .filter { $0.sourceRevision.source.bundleIdentifier != own }
        .map { workout in
          [
            "start": workout.startDate.timeIntervalSince1970 * 1000,
            "end": workout.endDate.timeIntervalSince1970 * 1000,
            "activity": Int(workout.workoutActivityType.rawValue),
            "source": workout.sourceRevision.source.name,
          ]
        }
    }

    // Body weight readings since `since`, newest first, in kilograms
    AsyncFunction("bodyWeights") { (since: Double) async throws -> [[String: Any]] in
      let query = HKSampleQueryDescriptor(
        predicates: [.quantitySample(type: HKQuantityType(.bodyMass), predicate: HKQuery.predicateForSamples(withStart: Date(timeIntervalSince1970: since / 1000), end: nil))],
        sortDescriptors: [SortDescriptor(\.endDate, order: .reverse)],
        limit: 500
      )
      return try await query.result(for: store).map { sample in
        [
          "date": sample.endDate.timeIntervalSince1970 * 1000,
          "kg": sample.quantity.doubleValue(for: .gramUnit(with: .kilo)),
        ]
      }
    }

    // Saves one logged workout, tagged with its log id so deleteWorkouts finds it again
    AsyncFunction("saveWorkout") { (id: String, start: Double, end: Double, activity: Int) async throws -> Bool in
      let configuration = HKWorkoutConfiguration()
      configuration.activityType = HKWorkoutActivityType(rawValue: UInt(activity)) ?? .traditionalStrengthTraining
      let builder = HKWorkoutBuilder(healthStore: store, configuration: configuration, device: .local())
      try await builder.beginCollection(at: Date(timeIntervalSince1970: start / 1000))
      try await builder.addMetadata([HKMetadataKeyExternalUUID: id, HKMetadataKeyWasUserEntered: true])
      try await builder.endCollection(at: Date(timeIntervalSince1970: end / 1000))
      return try await builder.finishWorkout() != nil
    }

    // Deletes the workouts LiftText saved for these log ids; iOS only lets an app delete its own
    AsyncFunction("deleteWorkouts") { (ids: [String]) async throws -> Int in
      let predicate = HKQuery.predicateForObjects(withMetadataKey: HKMetadataKeyExternalUUID, allowedValues: ids)
      return try await withCheckedThrowingContinuation { continuation in
        store.deleteObjects(of: HKObjectType.workoutType(), predicate: predicate) { _, count, error in
          if let error {
            continuation.resume(throwing: error)
          } else {
            continuation.resume(returning: count)
          }
        }
      }
    }
  }
}
