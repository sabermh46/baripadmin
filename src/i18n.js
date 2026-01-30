import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';



const resources = {
  en: {
    translation: {
      "welcome": "Welcome",
      "switch_lang": "Change Language",
      "dashboard": "Dashboard",
      "houses": "Houses",
      "notification": "Notification",
      "profile": "Profile",
      "staffs": "Staffs",
      "caretakers": "Caretakers",
      "caretaker": "Caretaker",
      "house_owners": "House Owners",
      "renters": "Renters",
      "settings": "Settings",
      "add_new_renter": "Add New Renter",
      "view": "View",
      "reports": "Reports",

      // Form Fields & Labels
      "full_name": "Full Name",
      "phone_number": "Phone Number",
      "alternative_phone": "Alternative Phone",
      "email_address": "Email Address",
      "nid_number": "NID Number",
      "nid_front_image": "NID Front Image",
      "nid_back_image": "NID Back Image",
      "status": "Status",
      "name": "Name",
      "phone": "Phone",
      "nid": "NID",

      // Actions
      "cancel": "Cancel",
      "create_renter": "Create Renter",
      "creating": "Creating...",
      "action": "Action",
      "refresh": "Refresh",
      "export_report": "Export Report",
      "export_as_csv": "Export as CSV",
      "go_to_dashboard": "Go to Dashboard",
      "go_back": "Go Back",

      // Statuses
      "active": "Active",
      "inactive": "Inactive",
      "pending": "Pending",
      "overdue": "Overdue",
      "partial": "Partial",

      // Dashboard & Stats
      "total_users": "Total Users",
      "total_houses": "Total Houses",
      "total_flats": "Total Flats",
      "active_users": "Active Users",
      "system_health": "System Health",
      "last_updated": "Last Updated",
      "total_collected": "Total Collected",
      "pending_amount": "Pending Amount",
      "total_transaction": "Total Transaction",
      "monthly_rate": "Monthly Rate",
      "expenses": "Expenses",
      "monthly_profit": "Monthly Profit",

      // Payments
      "date": "Date",
      "due_date": "Due Date",
      "amount": "Amount",
      "paid": "Paid",
      "method": "Method",
      "receipt": "Receipt",
      "rent_amount": "Rent Amount",
      "amount_paid": "Amount Paid",
      "no_payment_record_found": "No payment record found",

      // Payment Methods
      "cash": "Cash",
      "card": "Card",
      "bank_transfer": "Bank Transfer",
      "cheque": "Cheque",
      "mobile_payment": "Mobile Payment",
      "others": "Others",


      "failed_to_load_dashboard": "Failed to load dashboard",
      "please_try_again": "Please try again",
      "generate_invitation_link": "Generate Invitation Link",
      "active_staff": "Active Staff",
      "system_dashboard": "System Dashboard",

      "property": "Property",
      "address": "Address",
      "owner": "Owner",
      "flats": "Flats",
      "created": "Created",
      "actions": "Actions",

      "property_updated_successfully": "Property updated successfully",
      "failed_to_update_property": "Failed to update property",

      "house_statistics": "House Statistics",

      "view_all": "View All",
      "no_recent_properties": "No recent properties",
      "properties_you_add_will_appear_here": "Properties you add will appear here",
      "no_properties_found": "No properties found",
      "try_adjusting_search_or_create_new_property": "Try adjusting your search or create a new property",

      "total_properties": "Total Properties",
      "active_properties": "Active Properties",
      "house_list": "House List",
      "manage_all_houses": "Manage all Houses",
      "add_house": "Add House",
      "search_by_address": "Search by address...",
      "filters": "Filters",

      "install": "Install",
      "dismiss": "Dismiss",
      "new_version_available": "New version available!",
      "update_now": "Update Now",

      "install_our_app": "Install our App",

      "bari_porichalona": "Bari Porichalona",

      "active_caretakers": "Active Caretakers",
      "active_renters": "Active Renters",
      "recent_properties": "Recent Properties",

      "with_flats": "With Flats",
      "with_caretakers": "With Caretakers",

      "house_distribution": "House Distribution",
      "user_growth_last_12_months": "User Growth (Last 12 Months)",
      "recent_users": "Recent Users",
      "role_distribution": "Role Distribution",
      "system_performance": "System Performance",
      "recent_houses": "Recent Houses",
      "recent_notices": "Recent Notices",

       "staff_management": "Staff Management",
       "view_and_manage_all_staff_members_and_their_permissions": "View and manage all staff members and their permissions",
       "avg_permissions": "Avg. Permissions",
       "staff_members": "Staff Members",
       "role": "Role",
       "reports_to": "Reports To",
       "last_active": "Last Active",
       "total_staff": "Total Staff",
       "retry": "Retry",
       "search_by_name_or_email": "Search by name or email...",
       "add_caretaker": "Add Caretaker",
       
       "sort_by_name": "Sort by Name",
       "sort_by_date": "Sort by Date",
       "sort_by_email": "Sort by Email",
       "contact": "Contact",
       "assignments": "Assignments",
       "manage_caretaker_assignments": "Manage Caretaker Assignments",

        "delete_caretaker": "Delete Caretaker",
        "are_you_sure_you_want_to_delete": "Are you sure you want to delete",
        "this_will_remove_all_their_assignments_and_permissions_this_action_cannot_be_undone": "This will remove all their assignments and permissions. This action cannot be undone.",

        "manage_caretakers_and_their_permissions": "Manage Caretakers and their Permissions",
        "joined": "Joined",
        "accending": "Accending",
        "decending": "Decending",

        "search_owners_by_name_or_email": "Search owners by name or email",
        "welcome_back": "Welcome back",
         "monthly_rent": "Monthly Rent",
         "monthly_expenses": "Expenses",
        "check_your_email": "Check your email",
        "we_sent_password_reset_link": "We've sent a password reset link to",
        "forgot_password": "Forgot Password?",
        "no_worries_enter_email": "No worries, it happens. Enter your email and we'll send you a link.",
        "back_to_login": "Back to Login",
        "send_reset_link": "Send Reset Link",
    }
  },
  bn: {
    translation: {
      "welcome": "স্বাগতম",
      "switch_lang": "ভাষা পরিবর্তন করুন",
      "dashboard": "ড্যাশবোর্ড",
      "houses": "বাড়ি",
      "notification": "নোটিফিকেশন",
      "profile": "প্রোফাইল",
      "staffs": "স্টাফ",
      "caretakers": "পরিচারক",
      "caretaker": "পরিচারক",
      "house_owners": "বাড়ির মালিক",
      "renters": "ভাড়াটিয়া",
      "settings": "সেটিংস",
      "add_new_renter": "নতুন ভাড়াটিয়া যোগ করুন",
      "view": "দেখুন",
      "reports": "রিপোর্ট",

      // Form Fields & Labels
      "full_name": "সম্পূর্ণ নাম",
      "phone_number": "ফোন নম্বর",
      "alternative_phone": "বিকল্প ফোন নম্বর",
      "email_address": "ইমেল ঠিকানা",
      "nid_number": "এনআইডি নম্বর",
      "nid_front_image": "এনআইডি সামনের ছবি",
      "nid_back_image": "এনআইডি পিছনের ছবি",
      "status": "স্ট্যাটাস",
      "name": "নাম",
      "phone": "ফোন",
      "nid": "এনআইডি",

      // Actions
      "cancel": "বাতিল করুন",
      "create_renter": "ভাড়াটিয়া তৈরি করুন",
      "creating": "তৈরি করা হচ্ছে...",
      "action": "অ্যাকশন",
      "refresh": "রিফ্রেশ করুন",
      "export_report": "রিপোর্ট এক্সপোর্ট",
      "export_as_csv": "CSV হিসেবে এক্সপোর্ট",
      "go_to_dashboard": "ড্যাশবোর্ডে যান",
      "go_back": "ফিরে যান",


      // Statuses
      "active": "সক্রিয়",
      "inactive": "নিষ্ক্রিয়",
      "pending": "পেন্ডিং",
      "overdue": "সময় উত্তীর্ণ",
      "partial": "আংশিক",

      // Dashboard & Stats
      "total_users": "মোট ব্যবহারকারী",
      "total_houses": "মোট বাড়ি",
      "total_flats": "মোট ফ্ল্যাট",
      "active_users": "সক্রিয় ব্যবহারকারী",
      "system_health": "সিস্টেম হেলথ",
      "last_updated": "সর্বশেষ আপডেট",
      "total_collected": "মোট সংগ্রহ",
      "pending_amount": "বকেয়া পরিমাণ",
      "total_transaction": "মোট লেনদেন",
      "monthly_rate": "মাসিক হার",
      "expenses": "খরচ",
      "monthly_profit": "মাসিক লাভ",

      // Payments
      "date": "তারিখ",
      "due_date": "শেষ তারিখ",
      "amount": "পরিমাণ",
      "paid": "পরিশোধিত",
      "method": "মাধ্যম",
      "receipt": "রসিদ",
      "rent_amount": "ভাড়ার পরিমাণ",
      "amount_paid": "পরিশোধিত টাকা",
      "no_payment_record_found": "কোনো পেমেন্ট রেকর্ড পাওয়া যায়নি",

      // Payment Methods
      "cash": "নগদ",
      "card": "কার্ড",
      "bank_transfer": "ব্যাংক ট্রান্সফার",
      "cheque": "চেক",
      "mobile_payment": "মোবাইল পেমেন্ট",
      "others": "অন্যান্য",


      "failed_to_load_dashboard": "ড্যাশবোর্ড লোড করতে ব্যর্থ হয়েছে",
      "please_try_again": "আবার চেষ্টা করুন",
      "generate_invitation_link": "আমন্ত্রণ লিঙ্ক তৈরি করুন",
      "active_staff": "সক্রিয় স্টাফ",
      "system_dashboard": "সিস্টেম ড্যাশবোর্ড",

      "property": "বাড়ি",
      "address": "ঠিকানা",
      "owner": "মালিক",
      "flats": "ফ্ল্যাট",
      "created": "তৈরি হয়েছে",
      "actions": "অ্যাকশন",

      "property_updated_successfully": "বাড়ি সফলভাবে আপডেট হয়েছে",
      "failed_to_update_property": "বাড়ি আপডেট করতে ব্যর্থ হয়েছে",

      "house_statistics": "বাড়ির পরিসংখ্যান",
      "view_all": "সব দেখুন",
      "no_recent_properties": "কোন সাম্প্রতিক বাড়ি নেই",
      "properties_you_add_will_appear_here": "আপনি যে বাড়িগুলি যোগ করবেন সেগুলি এখানে প্রদর্শিত হবে",

      "no_properties_found": "কোনো বাড়ি পাওয়া যায়নি",
      "try_adjusting_search_or_create_new_property": "অনুগ্রহ করে আপনার অনুসন্ধান সামঞ্জস্য করুন বা একটি নতুন বাড়ি তৈরি করুন",
      "total_properties": "মোট বাড়ি",
      "active_properties": "সক্রিয় বাড়ি",
      "house_list": "বাড়ির  তালিকা",
      "manage_all_houses": "সব বাড়ি পরিচালনা করুন",
      "add_house": "বাড়ি যোগ করুন",
      "search_by_address": "ঠিকানা দ্বারা অনুসন্ধান করুন...",
      "filters": "ফিল্টার",

      "install": "ইনস্টল করুন",
      "dismiss": "বাতিল করুন",
      "new_version_available": "নতুন সংস্করণ উপলব্ধ!",
      "update_now": "এখনই আপডেট করুন",

      "install_our_app": "আমাদের অ্যাপ ইনস্টল করুন",
      "bari_porichalona": "বাড়ি পরিচালনা",
      "active_caretakers": "সক্রিয় পরিচারক",
      "active_renters": "সক্রিয় ভাড়াটিয়া",
      "recent_properties": "সাম্প্রতিক বাড়ি",

       "with_flats": "ফ্ল্যাট সহ",
       "with_caretakers": "পরিচারক সহ",

      "house_distribution": "বাড়ির বণ্টন",
      "user_growth_last_12_months": "ব্যবহারকারীর বৃদ্ধি (গত ১২ মাস)",
      "recent_users": "সাম্প্রতিক ব্যবহারকারী",
      "role_distribution": "ভূমিকা বণ্টন",
      "system_performance": "সিস্টেম পারফরম্যান্স",
      "recent_houses": "সাম্প্রতিক বাড়ি",
      "recent_notices": "সাম্প্রতিক বিজ্ঞপ্তি",

      "staff_management": "স্টাফ ব্যবস্থাপনা",
      "view_and_manage_all_staff_members_and_their_permissions": "সমস্ত স্টাফ সদস্য এবং তাদের অনুমতিগুলি দেখুন এবং পরিচালনা করুন",
      "avg_permissions": "গড় অনুমতি",
      "staff_members": "স্টাফ সদস্য",
      "role": "ভূমিকা",
      "reports_to": "রিপোর্ট করে",
      "last_active": "সর্বশেষ সক্রিয়",

      "total_staff": "মোট স্টাফ",
      "retry": "আবার চেষ্টা করুন",
      "search_by_name_or_email": "নাম বা ইমেল দ্বারা অনুসন্ধান করুন...",
      "add_caretaker": "পরিচারক যোগ করুন",
      "sort_by_name": "নাম দ্বারা সাজান",
      "sort_by_date": "তারিখ দ্বারা সাজান",
      "sort_by_email": "ইমেল দ্বারা সাজান",
      "contact": "যোগাযোগ",
      "assignments": "অ্যাসাইনমেন্ট",
      "manage_caretaker_assignments": "পরিচারক অ্যাসাইনমেন্ট পরিচালনা করুন",

        "delete_caretaker": "পরিচারক মুছুন",
        "are_you_sure_you_want_to_delete": "আপনি কি নিশ্চিত যে আপনি মুছে ফেলতে চান",
        "this_will_remove_all_their_assignments_and_permissions_this_action_cannot_be_undone": "এটি তাদের সমস্ত অ্যাসাইনমেন্ট এবং অনুমতিগুলি মুছে ফেলবে। এই ক্রিয়াটি পূর্বাবস্থায় ফেরানো যাবে না।",

        "manage_caretakers_and_their_permissions": "পরিচারক এবং তাদের অনুমতিগুলি পরিচালনা করুন",
        "joined": "যোগদান করেছেন",
        "accending": "উর্ধ্বনমিত",
        "decending": "অবনমিত",

        "search_owners_by_name_or_email": "নাম বা ইমেল দ্বারা মালিকদের অনুসন্ধান করুন",
        "welcome_back": "স্বাগতম",

          "monthly_rent": "মাসিক ভাড়া",
          "monthly_expenses": "মাসিক খরচ",
        "check_your_email": "আপনার ইমেল চেক করুন",
        "we_sent_password_reset_link": "আমরা একটি পাসওয়ার্ড রিসেট লিঙ্ক পাঠিয়েছি",
        "forgot_password": "পাসওয়ার্ড ভুলে গেছেন?",
        "no_worries_enter_email": "কোন চিন্তা নেই, এটা ঘটে। আপনার ইমেল লিখুন এবং আমরা আপনাকে একটি লিঙ্ক পাঠাব।",
        "back_to_login": "লগইনে ফিরে যান",
        "send_reset_link": "রিসেট লিঙ্ক পাঠান",

    }
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: "en",
    detection: {
      // Order of detection: 1. URL, 2. LocalStorage, 3. Cookie, 4. Browser
      order: ['querystring', 'localStorage', 'cookie', 'navigator'],
      // Cache the language in these locations
      caches: ['localStorage', 'cookie'],
    },
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;