Pod::Spec.new do |s|
  s.name           = 'LiftTextHealth'
  s.version        = '1.0.0'
  s.summary        = 'Reads workouts and body weight from Apple Health and saves LiftText workouts to it'
  s.description    = 'Reads workouts and body weight from Apple Health and saves LiftText workouts to it'
  s.author         = ''
  s.homepage       = 'https://docs.expo.dev/modules/'
  s.platforms      = { :ios => '16.4' }
  s.swift_version  = '5.9'
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  s.frameworks     = 'HealthKit'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  s.source_files = "**/*.{h,m,mm,swift}"
end
