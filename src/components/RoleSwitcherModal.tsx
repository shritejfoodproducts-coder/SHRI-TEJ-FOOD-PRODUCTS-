import React from 'react';
import { UserRole, UserProfile } from '../types/erp';
import { X, ShieldCheck, Smartphone, Check, UserCheck } from 'lucide-react';

interface RoleSwitcherModalProps {
  currentRole: UserRole;
  staffList: UserProfile[];
  onSelectRole: (role: UserRole) => void;
  onClose: () => void;
}

const ROLE_PERMISSIONS: Record<UserRole, {
  titleHindi: string;
  badgeColor: string;
  description: string;
  permissions: { name: string; allowed: boolean }[];
}> = {
  admin: {
    titleHindi: 'मालिक (Admin) - श्री तेज प्रकाश',
    badgeColor: 'bg-amber-500 text-slate-950',
    description: 'पूर्ण अधिकार: बिक्री, शुद्ध मुनाफा, बैंक गल्ला, सभी सेटिंग्स, डिलीट अधिकार, संपूर्ण बिज़नेस कंट्रोल।',
    permissions: [
      { name: 'पूरा बिज़नेस डैशबोर्ड व शुद्ध मुनाफा', allowed: true },
      { name: 'नया कर्मचारी जोड़ना व पासवर्ड बदलना', allowed: true },
      { name: 'बैंक व कैश गल्ला बैलेंस देखना व बदलना', allowed: true },
      { name: 'मास्टर Excel रिपोर्ट व बैकअप डाउनलोड', allowed: true },
      { name: 'फैक्ट्री सेटिंग्स व बिलिंग दरें बदलना', allowed: true },
    ],
  },
  manager: {
    titleHindi: 'फैक्ट्री मैनेजर (Manager) - मनोज कुमावत',
    badgeColor: 'bg-blue-600 text-white',
    description: 'स्टाफ प्रबंधन, कर्मचारी जोड़ना/आईडी बनाना, स्टॉक व प्रोडक्शन निगरानी, डिलीवरी ट्रैकिंग। (मुनाफा व बैंक बैलेंस छिपा रहेगा)',
    permissions: [
      { name: 'स्टॉक व प्रोडक्शन रिकॉर्ड दर्ज व मॉनिटर करना', allowed: true },
      { name: 'नए कर्मचारी जोड़ना व काम की रिपोर्ट देखना', allowed: true },
      { name: 'ऑर्डर बनाना व डिलीवरी स्थिति ट्रैक करना', allowed: true },
      { name: 'शुद्ध मुनाफा व बैंक खाता बैलेंस देखना', allowed: false },
      { name: 'फैक्ट्री मुख्य सेटिंग्स व GSTIN बदलना', allowed: false },
    ],
  },
  accountant: {
    titleHindi: 'अकाउंटेंट / मुनीम (Accountant) - दिनेश गुप्ता',
    badgeColor: 'bg-emerald-600 text-white',
    description: 'GST इनवॉइस, चालान बिलिंग, खर्च वाउचर एंट्री, ग्राहक बकाया वसूली व लेजर प्रबंधन।',
    permissions: [
      { name: 'GST टैक्स इनवॉइस व चालान बनाना', allowed: true },
      { name: 'खर्च वाउचर व पेमेंट रिकॉर्ड दर्ज करना', allowed: true },
      { name: 'ग्राहक उधारी व बकाया तगादा सूची', allowed: true },
      { name: 'फैक्ट्री उत्पादन बैच व चक्की सेटिंग', allowed: false },
    ],
  },
  store_keeper: {
    titleHindi: 'स्टोर कीपर / गोदाम इंचार्ज - रामलाल गुर्जर',
    badgeColor: 'bg-purple-600 text-white',
    description: 'कच्चा गेहूं आवक (क्विंटल), खाली 5/10/25/50 KG बैग गिनती, सिलाई धागा, स्टॉक अलर्ट।',
    permissions: [
      { name: 'गेहूं मंडी आवक व स्टॉक एंट्री', allowed: true },
      { name: 'खाली बैग्स व सिलाई धागा स्टॉक देखना', allowed: true },
      { name: 'तैयार आटा बोरियों का गोदाम स्टॉक', allowed: true },
      { name: 'बिलिंग व अकाउंट्स का विवरण', allowed: false },
    ],
  },
  production_head: {
    titleHindi: 'प्रोडक्शन इंचार्ज / चक्की हेड - ओमप्रकाश जांगिड़',
    badgeColor: 'bg-orange-600 text-white',
    description: 'गेहूं पिसाई, चक्की मिलिंग, आटा यील्ड, चोकर आउटपुट, छीजन % और शिफ्ट रिपोर्ट।',
    permissions: [
      { name: 'दैनिक पिसाई बैच व आटा आउटपुट दर्ज करना', allowed: true },
      { name: 'चोकर व छीजन प्रतिशत की मॉनिटरिंग', allowed: true },
      { name: 'मशीन बिजली यूनिट व मेंटेनेंस रिकॉर्ड', allowed: true },
      { name: 'फाइनेंशियल रिपोर्ट्स व बिलिंग', allowed: false },
    ],
  },
  packing_staff: {
    titleHindi: 'पैकिंग व सिलाई स्टाफ - कन्हैया लाल',
    badgeColor: 'bg-teal-600 text-white',
    description: 'तैयार आटे की बोरियों में भराई, 5k/10k/25k/50k बैग गिनती व डिस्पैच लोडिंग।',
    permissions: [
      { name: 'दैनिक बैग पैकिंग गिनती दर्ज करना', allowed: true },
      { name: 'खाली प्रिंटेड बैग स्टॉक देखना', allowed: true },
      { name: 'डिस्पैच गाड़ी में लोडिंग चेकलिस्ट', allowed: true },
      { name: 'अकाउंट्स व बिक्री के आंकड़े', allowed: false },
    ],
  },
  delivery_staff: {
    titleHindi: 'डिलीवरी स्टाफ / ड्राइवर - सोनू सैनी',
    badgeColor: 'bg-indigo-600 text-white',
    description: 'पिकअप गाड़ी में माल लोड, दुकानों पर डिलीवरी, डिलीवरी स्थल पर नकद/UPI कलेक्शन।',
    permissions: [
      { name: 'दुकानदार का पता व सीधे फोन कॉल करना', allowed: true },
      { name: 'डिलीवरी स्थिति (रवाना ➔ Delivered) अपडेट', allowed: true },
      { name: 'दुकान पर पेमेंट प्राप्त कर रसीद दर्ज करना', allowed: true },
      { name: 'फैक्ट्री का आंतरिक प्रोडक्शन व स्टॉक', allowed: false },
    ],
  },
  salesman: {
    titleHindi: 'सेल्समैन / फील्ड सेल्स - सुरेश कुमार',
    badgeColor: 'bg-amber-600 text-white',
    description: 'बाजार से नए ऑर्डर बुक करना, दुकानदारों से मिलना, उधारी बकाया वसूली व ग्राहक खाता देखना।',
    permissions: [
      { name: 'बाजार में दुकानदारों से नए ऑर्डर बुक करना', allowed: true },
      { name: 'ग्राहक लिस्ट, पता, फोन व बकाया उधारी देखना', allowed: true },
      { name: 'दुकानदार से नकद/UPI भुगतान प्राप्त करना', allowed: true },
      { name: 'फैक्ट्री की आंतरिक पिसाई व खरीद दरें', allowed: false },
    ],
  },
};

export const RoleSwitcherModal: React.FC<RoleSwitcherModalProps> = ({
  currentRole,
  onSelectRole,
  onClose,
}) => {
  const roles: UserRole[] = [
    'admin',
    'manager',
    'salesman',
    'accountant',
    'store_keeper',
    'production_head',
    'packing_staff',
    'delivery_staff',
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="font-bold text-base">Multi-Mobile रोल सिम्युलेटर (Role Simulator)</h3>
              <p className="text-xs text-slate-300">
                देखें कि किस कर्मचारी के Android मोबाइल पर कौन-सा इंटरफ़ेस दिखेगा
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 max-h-[75vh] overflow-y-auto space-y-3">
          {roles.map((role) => {
            const config = ROLE_PERMISSIONS[role];
            const isSelected = currentRole === role;

            return (
              <div
                key={role}
                onClick={() => {
                  onSelectRole(role);
                  onClose();
                }}
                className={`p-4 rounded-xl border-2 transition cursor-pointer ${
                  isSelected
                    ? 'border-amber-500 bg-amber-50/50 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${config.badgeColor}`}>
                      {config.titleHindi}
                    </span>
                    {isSelected && (
                      <span className="flex items-center gap-1 text-xs font-bold text-amber-800 bg-amber-200/60 px-2 py-0.5 rounded-full">
                        <Check className="w-3.5 h-3.5" />
                        वर्तमान एक्टिव रोल
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-xs text-slate-600 mt-2 font-medium">
                  {config.description}
                </p>

                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px]">
                  {config.permissions.map((p, idx) => (
                    <div key={idx} className="flex items-center gap-1.5">
                      <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] font-bold ${
                        p.allowed ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-400'
                      }`}>
                        {p.allowed ? '✓' : '✕'}
                      </span>
                      <span className={p.allowed ? 'text-slate-800 font-medium' : 'text-slate-400 line-through'}>
                        {p.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
