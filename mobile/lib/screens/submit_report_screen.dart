import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:image_picker/image_picker.dart';
import 'dart:io';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'home_screen.dart';
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
  
  String _selectedCategory = 'Infrastructure Issue';
  String _selectedPriority = 'MEDIUM';
  String? _selectedDepartment;
  bool _isSubmitting = false;

  // Address Fields
  String? _selectedKutaMagaalaa;
  String? _selectedAanaa;
  final _iddooAddaaController = TextEditingController();

  final List<String> _kutaMagaalaaList = [
    'Abba Gada', 'Bokkuu Shanan', 'Boolee', 'Daabee', 'Dambalaa', 'Luugoo'
  ];

  final List<String> _aanaaList = [
    'Dhakaa Adii', 'Diree Nagayaa', 'Goro', 'Haroreetii', 'Migiiraa', 'Solloqqee Dongorree', 'Torban Oboo', 'Other'
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

  final List<Map<String, String>> _categories = [
    {'en': 'Infrastructure Issue', 'om': "Rakkoo Bu'uuraa"},
    {'en': 'Water & Sanitation', 'om': "Bishaan fi Dhangala'aa"},
    {'en': 'Public Safety', 'om': 'Nageenya Hawaasaa'},
    {'en': 'Environment & Cleanliness', 'om': 'Naannoo fi Qulqullinaa'},
    {'en': 'Transport & Traffic', 'om': 'Geejjibaa fi Tiraafikaa'},
    {'en': 'Social Services', 'om': 'Tajaajila Hawaasummaa'},
  ];

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
      ).timeout(const Duration(seconds: 10), onTimeout: () {
        // Fallback coordinate if timeout
        return Position(
          longitude: 39.2689, latitude: 8.5415,
          timestamp: DateTime.now(),
          accuracy: 0.0, altitude: 0.0, heading: 0.0, speed: 0.0, speedAccuracy: 0.0,
          altitudeAccuracy: 0.0, headingAccuracy: 0.0, floor: null, isMocked: false
        );
      });
      setState(() {
        _currentPosition = position;
        _isLoadingLocation = false;
        _locationError = '';
      });
    } catch (e) {
      setState(() {
        _isLoadingLocation = false;
        _locationError = 'Failed to get location. Please try again.';
      });
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
      switch (_selectedCategory) {
        case 'Water & Sanitation': recommended = "Waajjira Bishaan Dhugaatii fi Dhangala'aa"; break;
        case 'Public Safety': recommended = 'Qajeelcha Poolisii'; break;
        case 'Environment & Cleanliness': recommended = 'Abbaa Taayitaa Eegumsa Naannoo'; break;
        case 'Transport & Traffic': recommended = 'Ejansii Geejjibaa'; break;
        case 'Infrastructure Issue': recommended = 'Abbaa Taayitaa Konistiraakshinii'; break;
        case 'Social Services': recommended = 'Waajjira Hojjataa fi Hawaasummaa'; break;
        default: recommended = 'Giddu-gala Tajaajilaa';
      }
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
    
    setState(() => _isSubmitting = true);
    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('auth_token');
      final headers = {
        'Content-Type': 'application/json',
        if (token != null) 'Authorization': 'Bearer $token',
      };

      final response = await http.post(
        Uri.parse('https://smartcitizenreportingsystem.onrender.com/api/v1/reports/'),
        headers: headers,
        body: jsonEncode({
          'description': _descriptionController.text,
          'latitude': _currentPosition?.latitude ?? 8.5415,
          'longitude': _currentPosition?.longitude ?? 39.2689,
          'aanaa': _selectedAanaa,
          'kuta_magaalaa': _selectedKutaMagaalaa,
          'iddoo_addaa': _iddooAddaaController.text,
          // 'category': 1, // Removed to avoid backend PK constraint errors on fresh db
        }),
      );
      
      if (response.statusCode != 201) {
        if (!mounted) return;
        setState(() => _isSubmitting = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error ${response.statusCode}: ${response.body}'),
            backgroundColor: Colors.red,
            duration: const Duration(seconds: 10),
          )
        );
        return;
      }
      
      final caseNum = jsonDecode(response.body)['case_number'] ?? 'AD-ERROR';

      if (!mounted) return;
      setState(() => _isSubmitting = false);

      final newReport = DemoReportItem(
        id: DateTime.now().millisecondsSinceEpoch.toString(),
        caseNumber: caseNum,
        title: _titleController.text,
        description: _descriptionController.text,
        status: 'SUBMITTED',
        priority: _selectedPriority,
        department: _selectedDepartment ?? 'Unassigned',
        category: _selectedCategory,
        createdAt: DateTime.now(),
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
      if (!mounted) return;
      setState(() => _isSubmitting = false);
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed to connect to backend: $e')));
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

                  // Category
                  _SectionHeader(title: 'Category', icon: Icons.category),
                  const SizedBox(height: 12),
                  Wrap(
                    spacing: 8, runSpacing: 8,
                    children: _categories.map((cat) {
                      final isSelected = _selectedCategory == cat['en'];
                      return ChoiceChip(
                        label: Text(cat['en']!),
                        selected: isSelected,
                        selectedColor: Colors.green[100],
                        onSelected: (selected) => setState(() => _selectedCategory = cat['en']!),
                      );
                    }).toList(),
                  ),
                  const SizedBox(height: 24),

                  // Details
                  _SectionHeader(title: 'Description', icon: Icons.edit_note),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _titleController,
                    decoration: InputDecoration(labelText: 'Title', border: OutlineInputBorder(borderRadius: BorderRadius.circular(12))),
                    validator: (value) => value!.isEmpty ? 'Required' : null,
                  ),
                  const SizedBox(height: 16),
                  TextFormField(
                    controller: _descriptionController,
                    decoration: InputDecoration(labelText: 'Detailed Description', border: OutlineInputBorder(borderRadius: BorderRadius.circular(12))),
                    maxLines: 4,
                    validator: (value) => value!.isEmpty ? 'Required' : null,
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
