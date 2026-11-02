/// Central API Configuration for the Adama Smart Citizen mobile app.
/// Switch the base URL here when testing locally or running in production.
class ApiConfig {
  /// Production Render URL (Default)
  static const String productionBaseUrl =
      'https://smartcitizenreportingsystem.onrender.com/api/v1';

  /// Android Emulator (10.0.2.2 points to host PC's localhost:8000)
  static const String emulatorBaseUrl = 'http://10.0.2.2:8000/api/v1';

  /// Localhost (Windows / Desktop / Web)
  static const String localBaseUrl = 'http://127.0.0.1:8000/api/v1';

  /// Current active base URL.
  /// To test with a local server, change this to [emulatorBaseUrl] or [localBaseUrl].
  static String baseUrl = productionBaseUrl;
}

