import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:permission_handler/permission_handler.dart';
import 'home_screen.dart';
import 'dart:async';

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
  bool _isAnonymous = false;
  bool _isSubmitting = false;

  // Location
  Position? _currentPosition;
  bool _isLoadingLocation = true;
  String _locationError = '';

  // Media (Mock state)
  bool _hasImage = false;
  bool _hasVideo = false;
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
      Position position = await Geolocator.getCurrentPosition(desiredAccuracy: LocationAccuracy.high);
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
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Microphone permission required')));
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

  void _pickMedia(String type) async {
    // Mock media picking
    var status = await Permission.camera.request();
    if (status != PermissionStatus.granted) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Camera permission required')));
      return;
    }

    setState(() {
      if (type == 'image') _hasImage = true;
      if (type == 'video') _hasVideo = true;
    });
  }

  String _recommendedDepartment() {
    switch (_selectedCategory) {
      case 'Water & Sanitation': return "Waajjira Bishaan Dhugaatii fi Dhangala'aa";
      case 'Public Safety': return 'Qajeelcha Poolisii';
      case 'Environment & Cleanliness': return 'Abbaa Taayitaa Eegumsa Naannoo';
      case 'Transport & Traffic': return 'Ejansii Geejjibaa';
      case 'Infrastructure Issue': return 'Abbaa Taayitaa Konistiraakshinii';
      default: return 'Giddu-gala Tajaajilaa';
    }
  }

  void _handleSubmit() {
    if (_locationError.isNotEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(_locationError), backgroundColor: Colors.red));
      return;
    }

    if (!_formKey.currentState!.validate()) return;
    
    setState(() => _isSubmitting = true);

    Future.delayed(const Duration(seconds: 1), () {
      if (!mounted) return;

      final caseNum = 'AD-${DateTime.now().millisecondsSinceEpoch.toString().substring(7)}';
      final newReport = DemoReportItem(
        id: DateTime.now().millisecondsSinceEpoch.toString(),
        caseNumber: caseNum,
        title: _titleController.text,
        description: _descriptionController.text,
        status: 'SUBMITTED',
        priority: _selectedPriority,
        department: _recommendedDepartment(),
        category: _selectedCategory,
        createdAt: DateTime.now(),
      );

      setState(() => _isSubmitting = false);

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
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Submit Incident')),
      body: _isLoadingLocation 
        ? const Center(child: CircularProgressIndicator())
        : SingleChildScrollView(
            padding: const EdgeInsets.all(16.0),
            child: Form(
              key: _formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Location Warning
                  if (_locationError.isNotEmpty)
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
                            onPressed: _checkLocationPermission,
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

                  // Media Uploads
                  _SectionHeader(title: 'Media Evidence', icon: Icons.perm_media),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: _MediaButton(
                          icon: Icons.camera_alt, label: 'Photo', active: _hasImage,
                          onTap: () => _pickMedia('image'),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: _MediaButton(
                          icon: Icons.videocam, label: 'Video', active: _hasVideo,
                          onTap: () => _pickMedia('video'),
                        ),
                      ),
                    ],
                  ),
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
