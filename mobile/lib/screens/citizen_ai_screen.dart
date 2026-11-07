import 'dart:async';
import 'package:flutter/material.dart';
import '../theme.dart';

/// Rule-based AI assistant that knows everything about the Adama Smart Citizen
/// Reporting System. Answers citizen questions in plain language.
/// Replace the _getAiReply() method with a real LLM API call when ready.
class CitizenAiScreen extends StatefulWidget {
  const CitizenAiScreen({super.key});

  @override
  State<CitizenAiScreen> createState() => _CitizenAiScreenState();
}

class _CitizenAiScreenState extends State<CitizenAiScreen> {
  final _controller = TextEditingController();
  final _scrollController = ScrollController();
  final List<_ChatMessage> _messages = [];
  bool _isTyping = false;

  @override
  void initState() {
    super.initState();
    // Greeting on open
    _messages.add(_ChatMessage(
      text: 'Akkam jirta! 👋 I am **Adama AI Assistant**, your guide to the Adama Smart Citizen Reporting System.\n\n'
          'I can help you with:\n'
          '• 📋 How to submit a report\n'
          '• 🔍 Track your case status\n'
          '• 🤝 "Me Too" — add your support to an existing report\n'
          '• ⚖️ How to file an appeal\n'
          '• 🏢 Which department handles what\n'
          '• 📱 How the app works\n\n'
          'Ask me anything in English, Afaan Oromo, or Amharic!',
      isUser: false,
      time: _now(),
    ));
  }

  @override
  void dispose() {
    _controller.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  // ── Send ──────────────────────────────────────────────────────────────────

  void _send() {
    final text = _controller.text.trim();
    if (text.isEmpty) return;
    _controller.clear();

    setState(() {
      _messages.add(_ChatMessage(text: text, isUser: true, time: _now()));
      _isTyping = true;
    });
    _scrollToBottom();

    // Simulate typing delay then reply
    Future.delayed(const Duration(milliseconds: 700), () {
      final reply = _getAiReply(text);
      if (mounted) {
        setState(() {
          _isTyping = false;
          _messages.add(_ChatMessage(text: reply, isUser: false, time: _now()));
        });
        _scrollToBottom();
      }
    });
  }

  void _scrollToBottom() {
    Future.delayed(const Duration(milliseconds: 100), () {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  String _now() {
    final t = DateTime.now();
    return '${t.hour.toString().padLeft(2, '0')}:${t.minute.toString().padLeft(2, '0')}';
  }

  // ── Rule-based AI ─────────────────────────────────────────────────────────

  String _getAiReply(String input) {
    final q = input.toLowerCase().trim();

    // ── Greetings ────────────────────────────────────────────────────────────
    if (_matches(q, ['hello', 'hi', 'hey', 'akkam', 'selam', 'salam', 'good morning', 'good afternoon'])) {
      return 'Hello! 👋 Welcome to Adama Smart Citizen. How can I help you today?';
    }
    if (_matches(q, ['thank', 'galatoomi', 'ameseginalehu', 'thanks'])) {
      return "You're welcome! 🙏 Is there anything else I can help you with?";
    }

    // ── What is this system ───────────────────────────────────────────────────
    if (_matches(q, ['what is', 'maal', 'describe', 'explain', 'about', 'system', 'app', 'adama smart'])) {
      return '📱 **Adama Smart Citizen Reporting System** is a mobile and web platform that lets citizens of Adama City:\n\n'
          '• Report public issues (potholes, water leaks, garbage, crime, etc.)\n'
          '• Track your report from submission to resolution\n'
          '• Communicate directly with the responsible department\n'
          '• Rate the service after resolution\n'
          '• File an appeal if you are not satisfied\n\n'
          'The system covers all **33 municipal departments** of Adama City Administration.';
    }

    // ── How to submit a report ───────────────────────────────────────────────
    if (_matches(q, ['submit', 'report', 'gabaasa', 'how to report', 'create report', 'new report', 'file', 'gabaasuu', 'raga'])) {
      return '📋 **How to Submit a Report:**\n\n'
          '1. Tap the **"REPORT AN ISSUE"** button on the home screen\n'
          '2. Allow the app to access your **GPS location** (required)\n'
          '3. Enter a **title** and **detailed description** of the problem\n'
          '4. Select the **department** responsible (or tap ✨ for AI recommendation)\n'
          '5. Choose the **priority** level (Low / Medium / High / Critical)\n'
          '6. Fill in your **address** (Sub-city, District, Specific Location)\n'
          '7. Optionally attach a **photo or video** as evidence\n'
          '8. Tap **Submit**\n\n'
          '✅ You will receive a **case number** (e.g. AD-3F7B2A) to track your report!\n\n'
          '💡 Tip: If a similar report already exists within 50 meters, you will be asked if you want to "+1 I am Also Affected" instead of creating a duplicate.';
    }

    // ── Track / Case status ───────────────────────────────────────────────────
    if (_matches(q, ['track', 'status', 'case', 'check', 'follow', 'hordofi', 'number', 'case number', 'ad-', 'where is my', 'update', 'progress'])) {
      return '🔍 **How to Track Your Report:**\n\n'
          '1. Tap the **"Report History"** tab (list icon at the bottom)\n'
          '2. Find your report by case number or description\n'
          '3. Tap it to open the **Report Details** screen\n\n'
          '**Status meanings:**\n'
          '🔵 **Submitted** — received by the system\n'
          '🟡 **Assigned** — assigned to an officer\n'
          '🟣 **Under Investigation** — being examined on site\n'
          '🟠 **In Progress** — repair/action underway\n'
          '🟢 **Resolved** — issue fixed (you can confirm or dispute)\n'
          '⚫ **Closed** — case completed\n\n'
          '📲 You will also receive an **SMS notification** on your phone when the status changes.';
    }

    // ── Me Too / Upvote ───────────────────────────────────────────────────────
    if (_matches(q, ['me too', 'upvote', 'same', 'also affected', 'affected', 'support', 'community', 'same issue', 'same problem', 'duplicate', 'already reported'])) {
      return '🤝 **"I am Also Affected" (Me Too):**\n\n'
          'If someone already reported the same issue near you, you don\'t need to create a new report. Instead:\n\n'
          '**Option 1 — During Submission:**\n'
          'When you submit a new report, if the app detects a similar report within **50 meters**, a dialog will appear showing the existing case. You can tap **"I\'m Also Affected"** to add your support instead.\n\n'
          '**Option 2 — From the Map:**\n'
          'Open the **Map tab** → tap a report marker → tap **"+1 Affected"** button in the popup.\n\n'
          '**Option 3 — From Report Details:**\n'
          'Open any report → in the Details tab, tap the **amber "+1 Affected Citizens"** button.\n\n'
          '💡 More affected citizens = higher priority score = faster officer response!';
    }

    // ── Appeal ────────────────────────────────────────────────────────────────
    if (_matches(q, ['appeal', 'iyyannoo', 'iyyata', 'dispute', 'not satisfied', 'wrong', 'unfair', 'rejected', 'reopen', 'complain', 'complaint', 'official appeal'])) {
      return '⚖️ **How to File an Administrative Appeal (Iyyannoo):**\n\n'
          'You can appeal if your report was:\n'
          '• Rejected unfairly\n'
          '• Marked Resolved but the issue is NOT fixed\n'
          '• Delayed without action for too long\n\n'
          '**Steps:**\n'
          '1. Open your report from **Report History**\n'
          '2. Scroll down in the **Details** tab\n'
          '3. Tap the **"File Official Appeal (Iyyannoo)"** button (indigo color)\n'
          '4. Enter the **grounds for your appeal** (required)\n'
          '5. Optionally state the **desired remedy** (e.g., re-investigation, site visit)\n'
          '6. Tap **Submit Appeal**\n\n'
          '📬 Your appeal is sent to **City Administration and the Mayor\'s Office** for review.\n'
          'You will receive a decision with an official appeal number (APL-XXXXXX).';
    }

    // ── Resolution confirm ────────────────────────────────────────────────────
    if (_matches(q, ['confirm', 'resolved', 'fixed', 'done', 'complete', "isn't fixed", 'not fixed', 'still broken', 'reopen', 'verify', 'resolution'])) {
      return '✅ **Confirming or Disputing a Resolution:**\n\n'
          'When an officer marks your report as **Resolved**, you will receive an SMS asking you to confirm.\n\n'
          '**In the app:**\n'
          '1. Open your report → Details tab\n'
          '2. You will see a section: **"Officer Resolution Proof & Verification"**\n'
          '3. There will be two buttons:\n'
          '   ✅ **"Yes, Issue Fixed"** — confirms the repair\n'
          '   ❌ **"No, Reopen"** — disputes it and reopens the case\n\n'
          'If you tap "No, Reopen", the report status changes back to **Reopened** and the department is notified.';
    }

    // ── Departments ───────────────────────────────────────────────────────────
    if (_matches(q, ['department', 'waajjira', 'which department', 'who handles', 'who is responsible', 'water', 'road', 'police', 'health', 'school', 'garbage', 'construction'])) {
      return '🏢 **Which Department Handles What:**\n\n'
          '🚰 **Water / Pipe leaks** → Waajjira Bishaan Dhugaatii fi Dhangala\'aa\n'
          '🚧 **Roads / Traffic** → Ejansii Geejjibaa\n'
          '🚔 **Crime / Safety** → Qajeelcha Poolisii\n'
          '♻️ **Garbage / Environment** → Abbaa Taayitaa Eegumsa Naannoo\n'
          '🏗️ **Construction / Buildings** → Abbaa Taayitaa Konistiraakshinii\n'
          '🏥 **Health / Hospital** → Waajjira Fayyaa\n'
          '📚 **Schools / Education** → Waajjira Barnoota\n'
          '⚡ **Electricity / Utilities** → Waajjira Saayinsii fi Teeknoloojii\n'
          '🌳 **Land / Property** → Waajjira Lafaa\n\n'
          '💡 Tip: Use the **AI Auto-Recommend button (✨)** when submitting a report — it analyzes your description and suggests the right department automatically!';
    }

    // ── SLA / How long ────────────────────────────────────────────────────────
    if (_matches(q, ['how long', 'when', 'deadline', 'sla', 'time', 'slow', 'delay', 'waiting', 'turnaround', 'days', 'hours'])) {
      return '⏱️ **Response Time (SLA — Service Level Agreement):**\n\n'
          'Each report has a legal resolution deadline based on priority:\n\n'
          '🔴 **Critical** — 12 hours (e.g., live wire, major burst pipe)\n'
          '🟠 **High** — 24 hours (e.g., road blockage, sewage overflow)\n'
          '🟡 **Medium** — 48 hours (e.g., street light, illegal dumping)\n'
          '🟢 **Low** — 72 hours (e.g., routine maintenance)\n\n'
          'You can see a **live countdown badge** on each report card:\n'
          '🟢 On Track • 🟡 Nearing Breach • 🔴 Overdue\n\n'
          'If unresolved after the deadline, the case automatically escalates to the **Department Manager**, then to the **Mayor\'s Command Center**.';
    }

    // ── GPS / Location ────────────────────────────────────────────────────────
    if (_matches(q, ['gps', 'location', 'map', 'coordinates', 'enable location', 'permission', 'adama boundary', 'outside adama'])) {
      return '📍 **Location & GPS:**\n\n'
          '• GPS is **required** to submit a report. This allows officers to find the exact location.\n'
          '• If you are **outside Adama City limits**, the app will warn you before submitting.\n'
          '• The system covers the **Adama City Administration boundary** (lat 8.45–8.63, lon 39.17–39.37).\n'
          '• If you are outside Adama, please contact the **Oromia Regional Administration** instead.\n\n'
          '**Enable GPS:**\n'
          'Settings → Location → Turn ON for the Adama Smart Citizen app.';
    }

    // ── SMS notifications ─────────────────────────────────────────────────────
    if (_matches(q, ['sms', 'notification', 'message', 'phone', 'notify', 'text', 'alert'])) {
      return '📱 **SMS Notifications:**\n\n'
          'The system sends automatic SMS messages to your registered phone number when:\n\n'
          '• ✅ Your report is submitted (with case number)\n'
          '• 👮 An officer is assigned to your case\n'
          '• 🔄 The status of your report changes\n'
          '• ✅ Your case is marked Resolved\n\n'
          'SMS is sent via our secure TextBee gateway using a real SIM card phone number.\n\n'
          '💡 Make sure your phone number is correct during registration!';
    }

    // ── Anonymous report ─────────────────────────────────────────────────────
    if (_matches(q, ['anonymous', 'anonymou', 'privacy', 'name', 'hide', 'identity', 'private'])) {
      return '🔒 **Anonymous Reporting:**\n\n'
          'You can submit reports anonymously. Your name and personal information will be hidden from the public map and officer view.\n\n'
          'The public transparency map shows only:\n'
          '• "Verified Citizen" or "Anonymous Citizen" (never your real name)\n'
          '• General location (kebele/sub-city level)\n'
          '• Case description and status\n\n'
          '⚠️ Note: Even anonymous reports require GPS and account registration for accountability.';
    }

    // ── Register / Login ──────────────────────────────────────────────────────
    if (_matches(q, ['register', 'sign up', 'create account', 'login', 'sign in', 'password', 'otp', 'verify', 'phone number'])) {
      return '🔐 **Registration & Login:**\n\n'
          '**To Register:**\n'
          '1. Tap **"Register"** tab on the login screen\n'
          '2. Enter your **phone number** (e.g. 0912345678)\n'
          '3. Tap **"Send Verification Code"**\n'
          '4. Enter the **6-digit OTP** sent to your phone via SMS\n'
          '5. Fill in your **full name** and set a **password**\n'
          '6. Tap **"Create Account"**\n\n'
          '**To Login:**\n'
          '1. Enter your phone number and password\n'
          '2. Tap **"Sign In"**\n\n'
          '💡 Your session stays active. The app auto-logs you in next time.';
    }

    // ── Public map ────────────────────────────────────────────────────────────
    if (_matches(q, ['public', 'transparency', 'map', 'everyone', 'view', 'see all', 'community', 'open'])) {
      return '🗺️ **Public Transparency Map:**\n\n'
          'Citizens can view ALL public reports on the map — even WITHOUT logging in!\n\n'
          'Visit the **Public Transparency Dashboard** from the login page.\n\n'
          'It shows:\n'
          '• All active and resolved municipal reports (anonymized)\n'
          '• Resolution statistics and rates\n'
          '• "Me Too" upvote buttons\n'
          '• AI Duplicate Scanner tool\n'
          '• Top civic champions leaderboard\n\n'
          'This ensures full government accountability to citizens!';
    }

    // ── Officer / Admin questions ─────────────────────────────────────────────
    if (_matches(q, ['officer', 'manager', 'admin', 'mayor', 'web', 'dashboard', 'staff', 'employee'])) {
      return '👮 **For Officers & Administrators:**\n\n'
          'Officers, department managers, and city administrators use the **web dashboard** at:\n'
          'https://smartcitizenreportingsystem.onrender.com\n\n'
          '**Login credentials** are provided by City Administration.\n\n'
          'The web portal allows:\n'
          '• Viewing and managing all reports for your department\n'
          '• Assigning cases to field officers\n'
          '• Updating status and uploading resolution proof photos\n'
          '• Sharing reports with other departments\n'
          '• Accessing audit trails and analytics\n'
          '• Mayor\'s Command Center for escalated cases';
    }

    // ── Escalation ────────────────────────────────────────────────────────────
    if (_matches(q, ['escalat', 'mayor', 'command', 'overdue', 'breach', 'ignored', 'no response'])) {
      return '🚨 **Automatic Escalation:**\n\n'
          'If your report is not acted on within the SLA deadline, the system automatically escalates:\n\n'
          '📌 **SLA Breached** → Escalated to **Department Manager**\n'
          '📌 **24h Overdue** → Escalated to **Mayor\'s Command Center** (Red Alert)\n\n'
          'The Mayor\'s office sees all escalated cases and can direct departments to act immediately.\n\n'
          'You will see the escalation status on your report card (🔴 Overdue badge).';
    }

    // ── Offline ───────────────────────────────────────────────────────────────
    if (_matches(q, ['offline', 'no internet', 'no connection', 'network', 'sync', 'weak signal'])) {
      return '📶 **Offline Support:**\n\n'
          'The Adama Smart Citizen app works in low-connectivity areas!\n\n'
          '• If you submit a report **without internet**, it is saved locally on your phone\n'
          '• As soon as you are back online, it **automatically syncs** to the server\n'
          '• You will see an **orange badge** on the Report History tab showing pending offline reports\n'
          '• Previously loaded reports are **cached** so you can still view them offline';
    }

    // ── Feedback / Rating ─────────────────────────────────────────────────────
    if (_matches(q, ['feedback', 'rating', 'star', 'satisfied', 'review', 'rate', 'service quality'])) {
      return '⭐ **Feedback & Rating:**\n\n'
          'Once your report is marked **Resolved or Closed**, you can rate the service:\n\n'
          '1. Open the report → Details tab\n'
          '2. Tap the star rating (1–5 stars)\n'
          '3. Select **Satisfied** or **Not Satisfied**\n'
          '4. Add a comment (optional)\n'
          '5. Tap **Submit Feedback**\n\n'
          'Your feedback helps improve municipal service quality and holds departments accountable.';
    }

    // ── Categories ────────────────────────────────────────────────────────────
    if (_matches(q, ['categor', 'type', 'kind', 'what can i report', 'what issues', 'list'])) {
      return '📂 **What Can You Report:**\n\n'
          '• 🚰 Water & Sanitation (burst pipes, sewage)\n'
          '• 🛣️ Roads & Traffic (potholes, broken lights, accidents)\n'
          '• 🗑️ Waste & Environment (illegal dumping, garbage)\n'
          '• 🔒 Public Safety (crime, unsafe structures)\n'
          '• 🏗️ Infrastructure (construction, collapsed walls)\n'
          '• 🌳 Green Spaces & Parks\n'
          '• 🏥 Health & Medical Facilities\n'
          '• 📚 Education & School Facilities\n'
          '• ⚡ Electricity & Utilities\n'
          '• 🏘️ Housing & Land Issues\n'
          '• 🚌 Public Transport\n'
          '• Any other municipal issue in Adama City';
    }

    // ── Help ──────────────────────────────────────────────────────────────────
    if (_matches(q, ['help', 'support', 'contact', 'call', 'phone number', 'office', 'headquarters'])) {
      return '📞 **Need More Help?**\n\n'
          '• **In-app chat**: Open any of your reports → Chat tab → message the responsible department directly\n'
          '• **City Administration**: Visit the Adama City Administration office\n'
          '• **Emergency**: Call 911 for life-threatening emergencies\n\n'
          'This AI assistant covers the most common questions. For case-specific issues, please use the in-report chat to reach the assigned officer directly.';
    }

    // ── Language ─────────────────────────────────────────────────────────────
    if (_matches(q, ['language', 'afaan', 'amharic', 'oromo', 'english', 'afaan oromo', 'translate'])) {
      return '🌍 **Language Support:**\n\n'
          'The app supports three languages:\n'
          '• **English** 🇬🇧\n'
          '• **Afaan Oromo** (official Oromia language)\n'
          '• **Amharic** (Ethiopian national language)\n\n'
          'To change language:\n'
          'Go to **Profile tab** → tap **Language** → select your preferred language.\n\n'
          'The entire interface including buttons, labels, and messages will switch instantly!';
    }

    // ── Default fallback ──────────────────────────────────────────────────────
    return 'I\'m not sure about that specific question. Here are topics I can help with — just ask!\n\n'
        '• 📋 How to submit a report\n'
        '• 🔍 Tracking your case\n'
        '• 🤝 "Me Too" / Upvote a report\n'
        '• ⚖️ Filing an appeal\n'
        '• ⏱️ Response times (SLA)\n'
        '• 🏢 Departments & their roles\n'
        '• 📱 SMS notifications\n'
        '• 📶 Offline mode\n'
        '• ⭐ Feedback & ratings\n\n'
        'You can also type your question in **Afaan Oromo** or **Amharic**.';
  }

  bool _matches(String input, List<String> keywords) {
    for (final k in keywords) {
      if (input.contains(k)) return true;
    }
    return false;
  }

  // ── Quick reply chips ─────────────────────────────────────────────────────

  static const _quickReplies = [
    '📋 How do I submit a report?',
    '🔍 How do I track my case?',
    '🤝 What is "Me Too"?',
    '⚖️ How do I file an appeal?',
    '⏱️ How long does it take?',
    '🏢 Which department handles water?',
  ];

  // ── Build ─────────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: CivicColors.canvasLight,
      appBar: AppBar(
        title: Row(
          children: [
            Container(
              width: 34, height: 34,
              decoration: BoxDecoration(
                gradient: LinearGradient(colors: [CivicColors.govBlue, CivicColors.navyDeep]),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.smart_toy_rounded, size: 20, color: Colors.white),
            ),
            const SizedBox(width: 10),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Adama AI Assistant', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800)),
                Text('Rule-based · Always available', style: TextStyle(fontSize: 10, color: Colors.white.withValues(alpha: 0.7), fontWeight: FontWeight.w500)),
              ],
            ),
          ],
        ),
        backgroundColor: CivicColors.navyDeep,
        foregroundColor: Colors.white,
        elevation: 0,
      ),
      body: Column(
        children: [
          // Chat messages
          Expanded(
            child: ListView.builder(
              controller: _scrollController,
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
              itemCount: _messages.length + (_isTyping ? 1 : 0),
              itemBuilder: (ctx, i) {
                if (_isTyping && i == _messages.length) {
                  return _TypingIndicator();
                }
                return _MessageBubble(message: _messages[i]);
              },
            ),
          ),

          // Quick replies
          if (_messages.length <= 2)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              child: SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: _quickReplies.map((q) => Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: GestureDetector(
                      onTap: () {
                        _controller.text = q;
                        _send();
                      },
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        decoration: BoxDecoration(
                          color: CivicColors.infoBg,
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: CivicColors.govBlue.withValues(alpha: 0.3)),
                        ),
                        child: Text(q, style: const TextStyle(fontSize: 12, color: CivicColors.govBlue, fontWeight: FontWeight.w600)),
                      ),
                    ),
                  )).toList(),
                ),
              ),
            ),

          // Input bar
          Container(
            padding: const EdgeInsets.fromLTRB(12, 8, 12, 16),
            decoration: BoxDecoration(
              color: Colors.white,
              boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.06), blurRadius: 10, offset: const Offset(0, -4))],
            ),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _controller,
                    onSubmitted: (_) => _send(),
                    maxLines: null,
                    textCapitalization: TextCapitalization.sentences,
                    decoration: InputDecoration(
                      hintText: 'Ask me anything...',
                      hintStyle: const TextStyle(color: CivicColors.textMuted, fontSize: 14),
                      filled: true,
                      fillColor: CivicColors.canvasLight,
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(24),
                        borderSide: BorderSide.none,
                      ),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                GestureDetector(
                  onTap: _send,
                  child: Container(
                    width: 46, height: 46,
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(colors: [CivicColors.govBlue, CivicColors.navyDeep]),
                      shape: BoxShape.circle,
                      boxShadow: [BoxShadow(color: CivicColors.govBlue.withValues(alpha: 0.4), blurRadius: 8, offset: const Offset(0, 3))],
                    ),
                    child: const Icon(Icons.send_rounded, color: Colors.white, size: 20),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ── Supporting widgets ─────────────────────────────────────────────────────────

class _ChatMessage {
  final String text;
  final bool isUser;
  final String time;
  const _ChatMessage({required this.text, required this.isUser, required this.time});
}

class _MessageBubble extends StatelessWidget {
  final _ChatMessage message;
  const _MessageBubble({required this.message});

  @override
  Widget build(BuildContext context) {
    final isUser = message.isUser;
    return Align(
      alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.82),
        decoration: BoxDecoration(
          color: isUser ? CivicColors.govBlue : Colors.white,
          borderRadius: BorderRadius.only(
            topLeft: const Radius.circular(18),
            topRight: const Radius.circular(18),
            bottomLeft: Radius.circular(isUser ? 18 : 4),
            bottomRight: Radius.circular(isUser ? 4 : 18),
          ),
          boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.06), blurRadius: 8, offset: const Offset(0, 2))],
          border: isUser ? null : Border.all(color: CivicColors.surfaceBorderLight),
        ),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (!isUser) ...[
              Row(children: [
                Container(
                  width: 20, height: 20,
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(colors: [CivicColors.govBlue, CivicColors.navyDeep]),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.smart_toy_rounded, size: 12, color: Colors.white),
                ),
                const SizedBox(width: 6),
                const Text('Adama AI', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: CivicColors.govBlue)),
              ]),
              const SizedBox(height: 6),
            ],
            _buildText(message.text, isUser),
            const SizedBox(height: 4),
            Text(
              message.time,
              style: TextStyle(
                fontSize: 10,
                color: isUser ? Colors.white.withValues(alpha: 0.6) : CivicColors.textMuted,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildText(String text, bool isUser) {
    // Parse **bold** markdown
    final spans = <TextSpan>[];
    final parts = text.split('**');
    for (int i = 0; i < parts.length; i++) {
      if (i % 2 == 1) {
        spans.add(TextSpan(text: parts[i], style: const TextStyle(fontWeight: FontWeight.w800)));
      } else {
        spans.add(TextSpan(text: parts[i]));
      }
    }
    return RichText(
      text: TextSpan(
        style: TextStyle(
          fontSize: 14,
          height: 1.55,
          color: isUser ? Colors.white : CivicColors.textPrimary,
        ),
        children: spans,
      ),
    );
  }
}

class _TypingIndicator extends StatefulWidget {
  @override
  State<_TypingIndicator> createState() => _TypingIndicatorState();
}

class _TypingIndicatorState extends State<_TypingIndicator> with SingleTickerProviderStateMixin {
  late AnimationController _ctrl;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(vsync: this, duration: const Duration(milliseconds: 900))..repeat();
  }

  @override
  void dispose() { _ctrl.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: const BorderRadius.only(topLeft: Radius.circular(18), topRight: Radius.circular(18), bottomRight: Radius.circular(18)),
          border: Border.all(color: CivicColors.surfaceBorderLight),
          boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 6)],
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: List.generate(3, (i) {
            return AnimatedBuilder(
              animation: _ctrl,
              builder: (_, __) {
                final offset = ((_ctrl.value + i * 0.3) % 1.0);
                final y = offset < 0.5 ? -4.0 * offset : -4.0 * (1.0 - offset);
                return Transform.translate(
                  offset: Offset(0, y * 2),
                  child: Container(
                    width: 7, height: 7,
                    margin: const EdgeInsets.symmetric(horizontal: 3),
                    decoration: BoxDecoration(color: CivicColors.govBlue.withValues(alpha: 0.6), shape: BoxShape.circle),
                  ),
                );
              },
            );
          }),
        ),
      ),
    );
  }
}
