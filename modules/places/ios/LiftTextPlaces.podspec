Pod::Spec.new do |s|
  s.name           = 'LiftTextPlaces'
  s.version        = '1.0.0'
  s.summary        = 'Finds food places near you with Apple Maps on the iPhone, for Find food near you'
  s.description    = 'Finds food places near you with Apple Maps on the iPhone, for Find food near you'
  s.author         = ''
  s.homepage       = 'https://docs.expo.dev/modules/'
  s.platforms      = { :ios => '16.4' }
  s.swift_version  = '5.9'
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  s.frameworks     = 'MapKit', 'CoreLocation'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  s.source_files = "**/*.{h,m,mm,swift}"
end
