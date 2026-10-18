Pod::Spec.new do |s|
  s.name           = 'PhotoPrivacy'
  s.version        = '1.0.0'
  s.summary        = 'Keeps progress photos out of backups and locked while the iPhone is locked'
  s.description    = 'Keeps progress photos out of backups and locked while the iPhone is locked'
  s.author         = ''
  s.homepage       = 'https://docs.expo.dev/modules/'
  s.platforms      = { :ios => '16.4' }
  s.swift_version  = '5.9'
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  s.source_files = "**/*.{h,m,mm,swift}"
end
