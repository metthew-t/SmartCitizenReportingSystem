import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:image_picker/image_picker.dart';
import 'dart:io';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:latlong2/latlong.dart';
import 'home_screen.dart';
import '../services/api_config.dart';
import '../services/sync_service.dart';
import '../services/database_helper.dart';
import '../theme.dart';
import 'dart:async';
import 'package:shared_preferences/shared_preferences.dart';

class SubmitReportScreen extends StatefulWidget {
  const SubmitReportScreen({super.key});

  @override
  State<SubmitReportScreen> createState() => _SubmitReportScreenState();
}

class _SubmitReportScreenState extends State<SubmitReportScreen> {
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _descriptionController = TextEditingController();
  
  String _selectedPriority = 'MEDIUM';
  String? _selectedDepartment;
  bool _isSubmitting = false;

  // Address Fields
  String? _selectedKutaMagaalaa;
  String? _selectedAanaa;
  String? _selectedKebele;
  final _iddooAddaaController = TextEditingController();

  final List<String> _kutaMagaalaaList = [
    'Abba Gada', 'Bokkuu Shanan', 'Boolee', 'Daabee', 'Dambalaa', 'Luugoo'
  ];

  final List<String> _aanaaList = [
    'Dhakaa Adii', 'Diree Nagayaa', 'Goro', 'Haroreetii', 'Migiiraa', 'Solloqqee Dongorree', 'Torban Oboo', 'Other'
  ];

  final List<String> _kebeleList = [
    'Kebele 01', 'Kebele 02', 'Kebele 03', 'Kebele 04', 'Kebele 05',
    'Kebele 06', 'Kebele 07', 'Kebele 08', 'Kebele 09', 'Kebele 10',
    'Kebele 11', 'Kebele 12', 'Kebele 13', 'Kebele 14', 'Kebele 15',
    'Kebele 16', 'Kebele 17', 'Kebele 18', 'Other'
  ];

  // Location
  Position? _currentPosition;
  bool _isLoadingLocation = true;
  String _locationError = '';

  // Media
  XFile? _selectedImage;
  XFile? _selectedVideo;
  final ImagePicker _picker = ImagePicker();
  
  bool _isRecordingAudio = false;
  bool _hasAudio = false;
  int _recordDuration = 0;
  Timer? _timer;

  final List<String> _departments = [
    "Galmeessa Siivilii", "Waajjira Invastimantii", "Bulchiinsaa fi Nageenya", 
    "Waajjira Hojjataa fi Hawaasummaa", "Waajjira Aadaa fi Turiizimii", 
    "Waajjira Milishaa", "Waajjira Dargaggoo fi Ispoortii", 
    "Waajjira Karoora/Pilaanii fi Misoomaa", "Qajeelcha Poolisii", 
    "Buusaa Gonofaa", "Abbaa Taayitaa Eegumsa Naannoo", 
    "Abbaa Taayitaa Konistiraakshinii", "Koomishinii Turizimii", 
    "Waajjira Lafaa", "Waajjira Fayyaa", "Waajjira Abbaa Alangaa", 
    "Waajjira Saayinsii fi Teeknoloojii", "Waajjira Bishaan Dhugaatii fi Dhangala'aa", 
    "Giddu-gala Tajaajilaa", "Waldaa Hojii Gamtaa", "Waajjira Albuuda", 
    "Waajjira Dhimma Dubartootaa fi Daa'immanii", "Mana Qopheessaa", 
    "Waajjira Galii", "Ejansii Geejjibaa", "Waajjira Kantiibaa", 
    "Waajjira PSMQN", "Waajjira Kominikeeshinii", "Waajjira Daldala", 
    "Waajjira Qonnaa", "Waajjira Maallaqaa", "Waajjira Carraa Hojii Uumuu fi Ogummaa", 
    "Waajjira Barnoota"
  ];

  final List<Map<String, dynamic>> _priorities = [
    {'value': 'LOW', 'label': 'Low', 'color': Colors.grey, 'icon': Icons.arrow_downward},
    {'value': 'MEDIUM', 'label': 'Medium', 'color': Colors.blue, 'icon': Icons.remove},
    {'value': 'HIGH', 'label': 'High', 'color': Colors.orange, 'icon': Icons.arrow_upward},
    {'value': 'CRITICAL', 'label': 'Critical', 'color': Colors.red, 'icon': Icons.warning},
  ];

  @override
  void initState() {
    super.initState();
    _checkLocationPermission();
  }

  @override
  void dispose() {
    _titleController.dispose();
    _descriptionController.dispose();
    _timer?.cancel();
    super.dispose();
  }

  Future<void> _checkLocationPermission() async {
    bool serviceEnabled;
    LocationPermission permission;

    serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      setState(() {
        _isLoadingLocation = false;
        _locationError = 'Please enable your location to continue. Your location is required so the responsible department can respond quickly.';
      });
      return;
    }

    permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) {
        setState(() {
          _isLoadingLocation = false;
          _locationError = 'Please enable your location to continue. Your location is required so the responsible department can respond quickly.';
        });
        return;
      }
    }

    if (permission == LocationPermission.deniedForever) {
      setState(() {
        _isLoadingLocation = false;
        _locationError = 'Please enable your location to continue. Your location is required so the responsible department can respond quickly.';
      });
      return;
    }

    // If permissions are granted, get the location
    try {
      Position position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
      );

      if (mounted) {
        setState(() {
          _currentPosition = position;
          _isLoadingLocation = false;
          _locationError = '';
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoadingLocation = false;
          _locationError = 'Failed to get actual location. Please check your GPS and try again.';
        });
      }
    }
  }

  void _startRecording() async {
    var status = await Permission.microphone.request();
    if (status != PermissionStatus.granted) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Microphone permission required')));
      return;
    }

    setState(() {
      _isRecordingAudio = true;
      _hasAudio = false;
      _recordDuration = 0;
    });

    _timer = Timer.periodic(const Duration(seconds: 1), (Timer t) {
      setState(() => _recordDuration++);
    });
  }

  void _stopRecording() {
    _timer?.cancel();
    setState(() {
      _isRecordingAudio = false;
      _hasAudio = true;
    });
  }

  Future<void> _pickImage() async {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (BuildContext context) {
        return SafeArea(
          child: Wrap(
            children: <Widget>[
              ListTile(
                leading: const Icon(Icons.photo_library),
                title: const Text('Photo Library'),
                onTap: () async {
                  Navigator.of(context).pop();
                  final XFile? image = await _picker.pickImage(source: ImageSource.gallery);
                  if (image != null) setState(() => _selectedImage = image);
                },
              ),
              ListTile(
                leading: const Icon(Icons.photo_camera),
                title: const Text('Camera'),
                onTap: () async {
                  Navigator.of(context).pop();
                  var status = await Permission.camera.request();
                  if (status.isGranted) {
                    final XFile? image = await _picker.pickImage(source: ImageSource.camera);
                    if (image != null) setState(() => _selectedImage = image);
                  } else {
                    if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Camera permission required')));
                  }
                },
              ),
            ],
          ),
        );
      },
    );
  }

  Future<void> _pickVideo() async {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (BuildContext context) {
        return SafeArea(
          child: Wrap(
            children: <Widget>[
              ListTile(
                leading: const Icon(Icons.video_library),
                title: const Text('Video Library'),
                onTap: () async {
                  Navigator.of(context).pop();
                  final XFile? video = await _picker.pickVideo(source: ImageSource.gallery);
                  if (video != null) setState(() => _selectedVideo = video);
                },
              ),
              ListTile(
                leading: const Icon(Icons.videocam),
                title: const Text('Camera'),
                onTap: () async {
                  Navigator.of(context).pop();
                  var status = await Permission.camera.request();
                  if (status.isGranted) {
                    final XFile? video = await _picker.pickVideo(source: ImageSource.camera);
                    if (video != null) setState(() => _selectedVideo = video);
                  } else {
                    if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Camera permission required')));
                  }
                },
              ),
            ],
          ),
        );
      },
    );
  }

  // ── Feature 3: Upvote an existing nearby report instead of submitting new ──
  Future<void> _upvoteExistingReport(String reportId, String caseNumber) async {
    try {
      final res = await http.post(
        Uri.parse('${ApiConfig.baseUrl}/reports/$reportId/upvote_affected/'),
        headers: {'Content-Type': 'application/json'},
      ).timeout(const Duration(seconds: 8));
      if (!mounted) return;
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        final count = data['affected_count'] ?? '?';
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text('✅ Recorded! $count citizens now affected on case $caseNumber. Officers will be notified.'),
          backgroundColor: CivicColors.emeraldGreen,
          duration: const Duration(seconds: 4),
        ));
      } else {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
          content: Text('Could not record your vote. Please try again.'),
          backgroundColor: CivicColors.statusAction,
        ));
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
          content: Text('Network error recording your vote.'),
          backgroundColor: Colors.red,
        ));
      }
    }
    if (mounted) Navigator.of(context).pop();
  }

  void _recommendDepartment() {
    final text = (_titleController.text + " " + _descriptionController.text).toLowerCase();
    String? recommended;

    if (text.contains('water') || text.contains('bishaan') || text.contains('pipe') || text.contains('leak')) {
      recommended = "Waajjira Bishaan Dhugaatii fi Dhangala'aa";
    } else if (text.contains('road') || text.contains('traffic') || text.contains('geejjibaa') || text.contains('street')) {
      recommended = "Ejansii Geejjibaa";
    } else if (text.contains('crime') || text.contains('police') || text.contains('theft') || text.contains('poolisii')) {
      recommended = "Qajeelcha Poolisii";
    } else if (text.contains('trash') || text.contains('garbage') || text.contains('environment') || text.contains('qulqullinaa')) {
      recommended = "Abbaa Taayitaa Eegumsa Naannoo";
    } else if (text.contains('construction') || text.contains('building') || text.contains('konistiraakshinii')) {
      recommended = "Abbaa Taayitaa Konistiraakshinii";
    } else if (text.contains('health') || text.contains('hospital') || text.contains('fayyaa')) {
      recommended = "Waajjira Fayyaa";
    } else if (text.contains('school') || text.contains('education') || text.contains('barnoota')) {
      recommended = "Waajjira Barnoota";
    } else if (text.contains('electric') || text.contains('power') || text.contains('light')) {
      recommended = "Waajjira Bishaan Dhugaatii fi Dhangala'aa"; // fallback for utility
    }

    if (recommended == null) {
      recommended = 'Giddu-gala Tajaajilaa';
    }

    if (recommended != null) {
      setState(() {
        _selectedDepartment = recommended;
      });
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text('AI Recommended: $recommended'),
        backgroundColor: Colors.green[700],
        duration: const Duration(seconds: 2),
      ));
    } else {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text('Could not auto-recommend. Please select manually.'),
        backgroundColor: Colors.orange,
      ));
    }
  }

  Future<void> _handleSubmit() async {
    if (_locationError.isNotEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(_locationError), backgroundColor: Colors.red));
      return;
    }

    if (!_formKey.currentState!.validate()) return;
    if (_selectedDepartment == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please select a responsible department.'), backgroundColor: Colors.red));
      return;
    }

    final lat = _currentPosition?.latitude ?? 8.5415;
    final lng = _currentPosition?.longitude ?? 39.2689;

    // ── Feature 6: Geofence pre-check ──────────────────────────────────────
    final bool insideBounds = (lat >= 8.45 && lat <= 8.63) && (lng >= 39.17 && lng <= 39.37);
    if (!insideBounds) {
      final proceed = await showDialog<bool>(
        context: context,
        builder: (ctx) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: Row(children: [
            Icon(Icons.location_off, color: Colors.orange[700]),
            const SizedBox(width: 8),
            const Expanded(child: Text('Outside Adama Limits', style: TextStyle(fontSize: 16))),
          ]),
          content: const Text(
            'Your current location appears to be outside the Adama City Administration municipal boundary.\n\n'
            'This system serves Adama city only. Issues outside these limits should be reported to the Oromia Regional Administration.\n\n'
            'Do you still want to continue?',
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
            ElevatedButton(
              onPressed: () => Navigator.pop(ctx, true),
              style: ElevatedButton.styleFrom(backgroundColor: Colors.orange[700], foregroundColor: Colors.white),
              child: const Text('Continue Anyway'),
            ),
          ],
        ),
      );
      if (proceed != true) return;
    }

    // ── Feature 3: Duplicate detection pre-check (100m proximity & issue match) ──
    try {
      final dupRes = await http.post(
        Uri.parse('${ApiConfig.baseUrl}/reports/check_duplicates/'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'latitude': lat,
          'longitude': lng,
          'threshold_meters': 100,
          'department_name': _selectedDepartment,
          'title': _titleController.text.trim(),
          'description': _descriptionController.text.trim(),
        }),
      ).timeout(const Duration(seconds: 3));

      if (dupRes.statusCode == 200) {
        final dupData = jsonDecode(dupRes.body);
        if (dupData['has_duplicates'] == true && mounted) {
          final dups = (dupData['duplicates'] as List<dynamic>? ?? []);
          final nearest = dups.isNotEmpty ? dups.first : null;
          final proceed = await showDialog<bool>(
            context: context,
            barrierDismissible: false,
            builder: (ctx) => AlertDialog(
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              title: Row(children: [
                Icon(Icons.warning_amber_rounded, color: Colors.orange[700], size: 26),
                const SizedBox(width: 8),
                const Expanded(child: Text('Matching Report Within 100m', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold))),
              ]),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (nearest != null) ...[
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.orange[50],
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: Colors.orange[200]!),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Case: ${nearest['case_number'] ?? ''}',
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                          const SizedBox(height: 4),
                          Text('"${(nearest['description'] ?? '').toString().substring(0, ((nearest['description'] ?? '').toString().length < 80) ? (nearest['description'] ?? '').toString().length : 80)}..."',
                              style: TextStyle(fontSize: 12, color: Colors.grey[700])),
                          const SizedBox(height: 4),
                          Row(children: [
                            Icon(Icons.location_on, size: 14, color: Colors.orange[700]),
                            const SizedBox(width: 4),
                            Text('${nearest['distance_meters']?.toStringAsFixed(0) ?? '?'} m away',
                                style: TextStyle(fontSize: 12, color: Colors.orange[700], fontWeight: FontWeight.w600)),
                            const SizedBox(width: 12),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                              decoration: BoxDecoration(color: Colors.green[100], borderRadius: BorderRadius.circular(8)),
                              child: Text(nearest['status'] ?? '', style: TextStyle(fontSize: 11, color: Colors.green[800], fontWeight: FontWeight.w600)),
                            ),
                          ]),
                          if ((nearest['affected_count'] ?? 1) > 1)
                            Padding(
                              padding: const EdgeInsets.only(top: 4),
                              child: Text('${nearest['affected_count']} citizens affected',
                                  style: TextStyle(fontSize: 12, color: Colors.indigo[700])),
                            ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 12),
                  ],
                  const Text(
                    'A matching report for this issue already exists within 100 meters. '
                    'Submitting a duplicate clogs the officer dispatch queue.\n\n'
                    'Tap "+1 I\'m Also Affected" to reinforce urgency on the existing report instead of creating a duplicate.',
                    style: TextStyle(fontSize: 13),
                  ),
                ],
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(ctx, true),
                  child: const Text('Submit New Anyway'),
                ),
                ElevatedButton(
                  onPressed: () => Navigator.pop(ctx, false),
                  style: ElevatedButton.styleFrom(backgroundColor: Colors.green[700], foregroundColor: Colors.white),
                  child: const Text("+1 I'm Also Affected"),
                ),
              ],
            ),
          );
          // User chose "I'm Also Affected" — upvote instead of new report
          if (proceed != true && nearest != null) {
            final reportId = nearest['id']?.toString();
            if (reportId != null && mounted) {
              await _upvoteExistingReport(reportId, nearest['case_number'] ?? '');
            }
            return;
          }
        }
      }
    } catch (_) {
      // Offline / network failure during duplicate check is non-fatal — proceed
    }

    setState(() => _isSubmitting = true);
    final fullDescription = _titleController.text.trim().isNotEmpty
        ? '${_titleController.text.trim()}\n\n${_descriptionController.text.trim()}'
        : _descriptionController.text.trim();

    // Helper to store in offline queue (Telegram style)
    Future<void> saveAndDisplayOfflineReport() async {
      try {
        final localId = await SyncService().queueOfflineReport({
          'description': fullDescription,
          'latitude': lat,
          'longitude': lng,
          'department_name': _selectedDepartment ?? '',
          'priority': _selectedPriority,
          'aanaa': _selectedAanaa ?? '',
          'kuta_magaalaa': _selectedKutaMagaalaa ?? '',
          'kebele': _selectedKebele ?? '',
          'iddoo_addaa': _iddooAddaaController.text.trim(),
          'image_path': _selectedImage?.path ?? '',
        });

        final offlineReport = ReportItem(
          id: localId,
          caseNumber: '🕒 Sync Pending',
          title: _titleController.text.isNotEmpty ? _titleController.text : _descriptionController.text,
          description: fullDescription,
          status: 'PENDING_SYNC',
          priority: _selectedPriority,
          department: _selectedDepartment ?? 'General',
          category: 'General',
          createdAt: DateTime.now(),
          location: LatLng(lat, lng),
        );

        if (!mounted) return;
        setState(() => _isSubmitting = false);

        await showDialog(
          context: context,
          barrierDismissible: false,
          builder: (ctx) => AlertDialog(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 56, height: 56,
                  decoration: BoxDecoration(color: Colors.amber[100], shape: BoxShape.circle),
                  child: const Icon(Icons.access_time_rounded, size: 34, color: Color(0xFFD97706)),
                ),
                const SizedBox(height: 14),
                const Text('Report Saved Offline', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                const Text(
                  'Your incident has been securely saved locally (Telegram-style).\n\nAs soon as your internet connection is restored, the report and photos will automatically sync to Adama City Administration.',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 13, color: Colors.black87, height: 1.4),
                ),
              ],
            ),
            actions: [
              ElevatedButton(
                onPressed: () {
                  Navigator.of(ctx).pop();
                  Navigator.of(context).pop(offlineReport);
                },
                style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF1D70B8), foregroundColor: Colors.white),
                child: const Text('Understood'),
              ),
            ],
          ),
        );
      } catch (err) {
        if (mounted) {
          setState(() => _isSubmitting = false);
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed to save offline: $err')));
        }
      }
    }

    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('auth_token');

      // If no token (offline guest), save directly to offline queue
      if (token == null || token.isEmpty) {
        await saveAndDisplayOfflineReport();
        return;
      }

      final headers = {'Content-Type': 'application/json', 'Authorization': 'Bearer $token'};

      final response = await http.post(
        Uri.parse('${ApiConfig.baseUrl}/reports/'),
        headers: headers,
        body: jsonEncode({
          'description': fullDescription,
          'latitude': lat,
          'longitude': lng,
          'aanaa': _selectedAanaa ?? '',
          'kuta_magaalaa': _selectedKutaMagaalaa ?? '',
          'kebele': _selectedKebele ?? '',
          'iddoo_addaa': _iddooAddaaController.text.trim(),
          'department_name': _selectedDepartment,
          'priority': _selectedPriority,
        }),
      ).timeout(const Duration(seconds: 5));
      
      if (response.statusCode != 201) {
        // If server returned error or token expired, fallback to offline queue
        await saveAndDisplayOfflineReport();
        return;
      }
      
      final decoded = jsonDecode(response.body);
      final caseNum = decoded['case_number'] ?? 'AD-NEW';
      final realId = decoded['id']?.toString() ?? DateTime.now().millisecondsSinceEpoch.toString();

      // Upload image if selected
      if (_selectedImage != null) {
        try {
          final uri = Uri.parse('${ApiConfig.baseUrl}/reports/$realId/upload_media/');
          final req = http.MultipartRequest('POST', uri);
          req.headers['Authorization'] = 'Bearer $token';
          req.files.add(await http.MultipartFile.fromPath('file', _selectedImage!.path));
          req.fields['media_type'] = 'IMAGE';
          await req.send().timeout(const Duration(seconds: 15));
        } catch (e) {
          debugPrint('Image upload failed: $e');
        }
      }

      // Cache server report locally
      try {
        await DatabaseHelper().cacheReports([decoded]);
      } catch (_) {}

      if (!mounted) return;
      setState(() => _isSubmitting = false);

      final newReport = ReportItem(
        id: realId,
        caseNumber: caseNum,
        title: _titleController.text.isNotEmpty ? _titleController.text : _descriptionController.text,
        description: fullDescription,
        status: 'SUBMITTED',
        priority: _selectedPriority,
        department: _selectedDepartment ?? 'Unassigned',
        category: 'General',
        createdAt: DateTime.now(),
        location: LatLng(lat, lng),
      );

      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (ctx) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.check_circle, size: 60, color: Colors.green[600]),
              const SizedBox(height: 16),
              const Text('Report Submitted!', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              Text('Case Number: $caseNum', style: TextStyle(fontSize: 16, color: Colors.indigo[600])),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () {
                Navigator.of(ctx).pop();
                Navigator.of(context).pop(newReport);
              },
              child: const Text('Done'),
            ),
          ],
        ),
      );
    } catch (e) {
      // Any network exception or timeout -> save offline immediately
      await saveAndDisplayOfflineReport();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Submit Incident')),
      body: SingleChildScrollView(
            padding: const EdgeInsets.all(16.0),
            child: Form(
              key: _formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Location Status / Warning
                  if (_isLoadingLocation)
                    Container(
                      padding: const EdgeInsets.all(16),
                      margin: const EdgeInsets.only(bottom: 16),
                      decoration: BoxDecoration(color: Colors.blue[50], borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.blue[200]!)),
                      child: Row(
                        children: [
                          const SizedBox(width: 24, height: 24, child: CircularProgressIndicator(strokeWidth: 2)),
                          const SizedBox(width: 16),
                          Expanded(child: Text('Acquiring location...', style: TextStyle(color: Colors.blue[800], fontWeight: FontWeight.w600))),
                        ],
                      ),
                    )
                  else if (_locationError.isNotEmpty)
                    Container(
                      padding: const EdgeInsets.all(16),
                      margin: const EdgeInsets.only(bottom: 16),
                      decoration: BoxDecoration(color: Colors.red[50], borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.red[200]!)),
                      child: Column(
                        children: [
                          Icon(Icons.location_off, color: Colors.red[700], size: 32),
                          const SizedBox(height: 8),
                          Text(_locationError, textAlign: TextAlign.center, style: TextStyle(color: Colors.red[800], fontSize: 13, fontWeight: FontWeight.w600)),
                          const SizedBox(height: 12),
                          ElevatedButton(
                            onPressed: () {
                              setState(() => _isLoadingLocation = true);
                              _checkLocationPermission();
                            },
                            style: ElevatedButton.styleFrom(backgroundColor: Colors.red[700], foregroundColor: Colors.white),
                            child: const Text('Enable Location'),
                          )
                        ],
                      ),
                    ),

                  // Geofence Pre-alert banner (Outside Adama City detection)
                  if (!_isLoadingLocation && _currentPosition != null &&
                      ((_currentPosition!.latitude < 8.45 || _currentPosition!.latitude > 8.63) ||
                       (_currentPosition!.longitude < 39.17 || _currentPosition!.longitude > 39.37)))
                    Container(
                      padding: const EdgeInsets.all(14),
                      margin: const EdgeInsets.only(bottom: 16),
                      decoration: BoxDecoration(
                        color: Colors.amber[50],
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: Colors.amber[400]!),
                      ),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Icon(Icons.warning_amber_rounded, color: Colors.amber[800], size: 24),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text('Location Notice: Outside Adama City Limits',
                                    style: TextStyle(color: Colors.amber[900], fontWeight: FontWeight.bold, fontSize: 13)),
                                const SizedBox(height: 4),
                                Text(
                                  'Your detected coordinates (${_currentPosition!.latitude.toStringAsFixed(4)}, ${_currentPosition!.longitude.toStringAsFixed(4)}) appear to be outside the Adama Municipal zone. '
                                  'This reporting system serves Adama City only.',
                                  style: TextStyle(color: Colors.amber[900], fontSize: 12),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),

                  // Details (Title & Description first per government workflow standard)
                  _SectionHeader(title: 'Case Title & Description', icon: Icons.edit_note),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _titleController,
                    decoration: InputDecoration(
                      labelText: 'Case Title / Mata Duree / ርዕስ',
                      hintText: 'e.g. Broken water pipe near Kebele 04 market',
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    validator: (value) => value!.isEmpty ? 'Please enter a case title' : null,
                  ),
                  const SizedBox(height: 16),
                  TextFormField(
                    controller: _descriptionController,
                    decoration: InputDecoration(
                      labelText: 'Detailed Description / Ibsa Bal\'aa / ዝርዝር መግለጫ',
                      hintText: 'Describe what happened, when it started, and the impact...',
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    maxLines: 4,
                    validator: (value) => value!.isEmpty ? 'Please provide case description' : null,
                  ),
                  const SizedBox(height: 24),

                  // Department Selection
                  _SectionHeader(title: 'Responsible Department', icon: Icons.account_balance),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: DropdownButtonFormField<String>(
                          isExpanded: true,
                          decoration: InputDecoration(
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                            contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 16),
                          ),
                          hint: const Text('Select Department'),
                          value: _selectedDepartment,
                          items: _departments.map((dept) => DropdownMenuItem(value: dept, child: Text(dept, overflow: TextOverflow.ellipsis))).toList(),
                          onChanged: (val) => setState(() => _selectedDepartment = val),
                          validator: (value) => value == null ? 'Required' : null,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Tooltip(
                        message: 'Auto-Recommend using AI rule-based logic',
                        child: ElevatedButton(
                          onPressed: _recommendDepartment,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.indigo[50],
                            foregroundColor: Colors.indigo[700],
                            padding: const EdgeInsets.all(16),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                          child: const Icon(Icons.auto_awesome),
                        ),
                      )
                    ],
                  ),
                  const SizedBox(height: 24),

                  // Address Information
                  _SectionHeader(title: 'Address Information', icon: Icons.location_city),
                  const SizedBox(height: 12),
                  DropdownButtonFormField<String>(
                    isExpanded: true,
                    decoration: InputDecoration(
                      labelText: 'Kuta Magaalaa / ክፍለ ከተማ / Sub-city',
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    value: _selectedKutaMagaalaa,
                    items: _kutaMagaalaaList.map((k) => DropdownMenuItem(value: k, child: Text(k))).toList(),
                    onChanged: (val) => setState(() => _selectedKutaMagaalaa = val),
                    validator: (value) => value == null ? 'Required' : null,
                  ),
                  const SizedBox(height: 16),
                  DropdownButtonFormField<String>(
                    isExpanded: true,
                    decoration: InputDecoration(
                      labelText: 'Aanaa / ወረዳ / District',
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    value: _selectedAanaa,
                    items: _aanaaList.map((a) => DropdownMenuItem(value: a, child: Text(a))).toList(),
                    onChanged: (val) => setState(() => _selectedAanaa = val),
                    validator: (value) => value == null ? 'Required' : null,
                  ),
                  const SizedBox(height: 16),
                  DropdownButtonFormField<String>(
                    isExpanded: true,
                    decoration: InputDecoration(
                      labelText: 'Kebele / ቀበሌ',
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    value: _selectedKebele,
                    items: _kebeleList.map((k) => DropdownMenuItem(value: k, child: Text(k))).toList(),
                    onChanged: (val) => setState(() => _selectedKebele = val),
                    validator: (value) => value == null ? 'Required' : null,
                  ),
                  const SizedBox(height: 16),
                  TextFormField(
                    controller: _iddooAddaaController,
                    decoration: InputDecoration(
                      labelText: 'Iddoo Addaa / ልዩ ቦታ / Specific Location',
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    validator: (value) => value!.isEmpty ? 'Required' : null,
                  ),
                  const SizedBox(height: 24),

                  // Media Uploads
                  _SectionHeader(title: 'Media Evidence', icon: Icons.perm_media),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: _MediaButton(
                          icon: Icons.camera_alt, 
                          label: _selectedImage != null ? 'Photo Added' : 'Add Photo', 
                          active: _selectedImage != null,
                          onTap: _pickImage,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: _MediaButton(
                          icon: Icons.videocam, 
                          label: _selectedVideo != null ? 'Video Added' : 'Add Video', 
                          active: _selectedVideo != null,
                          onTap: _pickVideo,
                        ),
                      ),
                    ],
                  ),
                  if (_selectedImage != null || _selectedVideo != null) ...[
                    const SizedBox(height: 12),
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(color: Colors.grey[100], borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.grey[300]!)),
                      child: Row(
                        children: [
                          if (_selectedImage != null) ...[
                            ClipRRect(
                              borderRadius: BorderRadius.circular(8),
                              child: Image.file(File(_selectedImage!.path), width: 50, height: 50, fit: BoxFit.cover),
                            ),
                            const SizedBox(width: 12),
                          ],
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                if (_selectedImage != null) Text('Image: ${_selectedImage!.name}', maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 12)),
                                if (_selectedVideo != null) Text('Video: ${_selectedVideo!.name}', maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 12)),
                              ],
                            ),
                          ),
                          IconButton(
                            icon: const Icon(Icons.delete, color: Colors.red),
                            onPressed: () => setState(() {
                              _selectedImage = null;
                              _selectedVideo = null;
                            }),
                          ),
                        ],
                      ),
                    ),
                  ],
                  const SizedBox(height: 12),
                  
                  // Audio Recorder
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(color: Colors.grey[100], borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.grey[300]!)),
                    child: Row(
                      children: [
                        IconButton(
                          icon: Icon(_isRecordingAudio ? Icons.stop_circle : Icons.mic, size: 32, color: _isRecordingAudio ? Colors.red : Colors.green[700]),
                          onPressed: _isRecordingAudio ? _stopRecording : _startRecording,
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Text(
                            _isRecordingAudio ? 'Recording... ${_recordDuration}s' : (_hasAudio ? 'Voice note attached (${_recordDuration}s)' : 'Tap to record voice note'),
                            style: TextStyle(fontWeight: _isRecordingAudio ? FontWeight.bold : FontWeight.normal, color: _isRecordingAudio ? Colors.red : Colors.black87),
                          ),
                        ),
                        if (_hasAudio && !_isRecordingAudio)
                          IconButton(icon: const Icon(Icons.delete, color: Colors.grey), onPressed: () => setState(() { _hasAudio = false; _recordDuration = 0; })),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),

                  // Priority
                  _SectionHeader(title: 'Priority', icon: Icons.flag),
                  const SizedBox(height: 12),
                  Row(
                    children: _priorities.map((p) {
                      final isSelected = _selectedPriority == p['value'];
                      return Expanded(
                        child: GestureDetector(
                          onTap: () => setState(() => _selectedPriority = p['value']),
                          child: Container(
                            margin: const EdgeInsets.symmetric(horizontal: 4),
                            padding: const EdgeInsets.symmetric(vertical: 12),
                            decoration: BoxDecoration(
                              color: isSelected ? (p['color'] as Color).withValues(alpha: 0.12) : Colors.grey[50],
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: isSelected ? (p['color'] as Color) : Colors.grey[200]!, width: isSelected ? 2 : 1),
                            ),
                            child: Column(
                              children: [
                                Icon(p['icon'] as IconData, color: p['color'] as Color, size: 20),
                                const SizedBox(height: 4),
                                Text(p['label'] as String, style: TextStyle(fontSize: 11, fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal, color: isSelected ? p['color'] as Color : Colors.grey[600])),
                              ],
                            ),
                          ),
                        ),
                      );
                    }).toList(),
                  ),
                  const SizedBox(height: 24),

                  // Location Display
                  _SectionHeader(title: 'Location', icon: Icons.map),
                  const SizedBox(height: 12),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(color: Colors.green[50], borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.green[200]!)),
                    child: Row(
                      children: [
                        Icon(Icons.my_location, color: Colors.green[700]),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Text(
                            _currentPosition != null 
                              ? 'Lat: ${_currentPosition!.latitude.toStringAsFixed(4)}, Lng: ${_currentPosition!.longitude.toStringAsFixed(4)}'
                              : 'Location pending...',
                            style: TextStyle(color: Colors.green[900], fontWeight: FontWeight.w600),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),

                  ElevatedButton(
                    onPressed: _locationError.isEmpty && !_isSubmitting ? _handleSubmit : null,
                    style: ElevatedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      backgroundColor: Colors.green[700],
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    ),
                    child: _isSubmitting 
                        ? const CircularProgressIndicator(color: Colors.white)
                        : const Text('SUBMIT REPORT', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                  ),
                  const SizedBox(height: 32),
                ],
              ),
            ),
          ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  final String title;
  final IconData icon;

  const _SectionHeader({required this.title, required this.icon});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, size: 20, color: Colors.green[700]),
        const SizedBox(width: 8),
        Text(title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
      ],
    );
  }
}

class _MediaButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool active;
  final VoidCallback onTap;

  const _MediaButton({required this.icon, required this.label, required this.active, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 16),
        decoration: BoxDecoration(
          color: active ? Colors.green[50] : Colors.grey[50],
          border: Border.all(color: active ? Colors.green[300]! : Colors.grey[300]!),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          children: [
            Icon(active ? Icons.check_circle : icon, color: active ? Colors.green[700] : Colors.grey[600]),
            const SizedBox(height: 4),
            Text(label, style: TextStyle(color: active ? Colors.green[700] : Colors.grey[700], fontWeight: active ? FontWeight.bold : FontWeight.normal)),
          ],
        ),
      ),
    );
  }
}
