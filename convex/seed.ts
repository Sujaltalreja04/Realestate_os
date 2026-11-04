import { mutation } from "./_generated/server";

const INITIAL_PROPERTIES = [
  { 
    name: "Ai RealEstate OS Skyview", 
    location: "Ambawadi", 
    price: 25000000, 
    bhk: "3 & 4 BHK", 
    status: "Under Construction", 
    image: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=600&q=80", 
    completion: "Dec 2026", 
    stats: { views: 4280, inquiries: 312, trend: "+24%" },
    builder: "Ai RealEstate OS Group",
    reraNumber: "PR/GJ/AHMEDABAD/AUDA/CAA00123/251226",
    amenities: ["Rooftop Garden", "Infinite Pool", "Double-Height Lounge", "Yoga Sanctuary", "EV Charging", "Squash Court"],
    brochure: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
    virtualTour: "https://demo.virtualtour.com/skyview"
  },
  { 
    name: "Ai RealEstate OS Highlife", 
    location: "SG Highway", 
    price: 18000000, 
    bhk: "3 BHK", 
    status: "Ready to Move", 
    image: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=600&q=80", 
    completion: "Ready", 
    stats: { views: 8940, inquiries: 645, trend: "+19%" },
    builder: "Ai RealEstate OS Group",
    reraNumber: "PR/GJ/AHMEDABAD/AUDA/CAA00456/150124",
    amenities: ["Clubhouse Lounge", "Gymnasium", "Children Play Area", "Cricket Pitch", "Banquet Hall", "Library"],
    brochure: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
    virtualTour: "https://demo.virtualtour.com/highlife"
  },
  { 
    name: "Ai RealEstate OS Edge", 
    location: "Bopal", 
    price: 12000000, 
    bhk: "2 & 3 BHK", 
    status: "Newly Launched", 
    image: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600&q=80", 
    completion: "Mar 2027", 
    stats: { views: 5610, inquiries: 418, trend: "+38%" },
    builder: "Ai RealEstate OS Group",
    reraNumber: "PR/GJ/AHMEDABAD/AUDA/CAA00789/300327",
    amenities: ["Co-working Space", "Electric Vehicle Chargers", "Jogging Track", "Mini Theater", "Pet Park"],
    brochure: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
    virtualTour: "https://demo.virtualtour.com/edge"
  },
  { 
    name: "Ai RealEstate OS Signature Villas", 
    location: "Sindhu Bhavan", 
    price: 52000000, 
    bhk: "4 & 5 BHK", 
    status: "Under Construction", 
    image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&q=80", 
    completion: "Aug 2027", 
    stats: { views: 3200, inquiries: 184, trend: "+45%" },
    builder: "Ai RealEstate OS Group",
    reraNumber: "PR/GJ/AHMEDABAD/AUDA/CAA00999/150827",
    amenities: ["Private Heated Pool", "Italian Marble Flooring", "Smart Home Automation", "Private Elevator", "Landscaped Courtyard"],
    brochure: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
    virtualTour: "https://demo.virtualtour.com/signature"
  }
];

const INITIAL_INVENTORY = [
  // Skyview Tower A
  { tower: "Tower A", floor: 14, status: "Available", unit: "1401", type: "4 BHK Penthouse", views: ["Skyline", "Garden"], price: 38000000, area: 3200, facing: "East", amenities: ["Private Terrace", "Infinite Pool"], reraNumber: "PR/GJ/AHMEDABAD/AUDA/CAA00123/251226", constructionStatus: "Finishing Stage", brochure: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf", floorPlan: "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=600&q=80", virtualTour: "https://demo.virtualtour.com/skyview" },
  { tower: "Tower A", floor: 14, status: "Booked", unit: "1402", type: "4 BHK Penthouse", views: ["Skyline", "Pool"], price: 37500000, area: 3150, facing: "North-East", amenities: ["Private Terrace"], reraNumber: "PR/GJ/AHMEDABAD/AUDA/CAA00123/251226", constructionStatus: "Finishing Stage", brochure: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf", floorPlan: "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=600&q=80", virtualTour: "https://demo.virtualtour.com/skyview" },
  { tower: "Tower A", floor: 12, status: "Available", unit: "1201", type: "3 BHK", views: ["Skyline", "Garden"], price: 25000000, area: 2100, facing: "East", amenities: ["Rooftop Garden", "Infinite Pool"], reraNumber: "PR/GJ/AHMEDABAD/AUDA/CAA00123/251226", constructionStatus: "Slab Completed", brochure: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf", floorPlan: "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=600&q=80", virtualTour: "https://demo.virtualtour.com/skyview" },
  { tower: "Tower A", floor: 12, status: "Sold", unit: "1202", type: "3 BHK", views: ["Clubhouse"], price: 24500000, area: 2050, facing: "West", amenities: ["Rooftop Garden"], reraNumber: "PR/GJ/AHMEDABAD/AUDA/CAA00123/251226", constructionStatus: "Slab Completed", brochure: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf", floorPlan: "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=600&q=80", virtualTour: "https://demo.virtualtour.com/skyview" },
  { tower: "Tower A", floor: 12, status: "Hold", unit: "1203", type: "3 BHK", views: ["Skyline"], price: 24800000, area: 2080, facing: "North-East", amenities: ["Rooftop Garden", "Infinite Pool"], reraNumber: "PR/GJ/AHMEDABAD/AUDA/CAA00123/251226", constructionStatus: "Slab Completed", brochure: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf", floorPlan: "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=600&q=80", virtualTour: "https://demo.virtualtour.com/skyview" },
  { tower: "Tower A", floor: 12, status: "Available", unit: "1204", type: "4 BHK", views: ["Skyline", "Pool"], price: 34000000, area: 2850, facing: "East", amenities: ["Infinite Pool", "Double-Height Lounge"], reraNumber: "PR/GJ/AHMEDABAD/AUDA/CAA00123/251226", constructionStatus: "Slab Completed", brochure: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf", floorPlan: "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=600&q=80", virtualTour: "https://demo.virtualtour.com/skyview" },
  { tower: "Tower A", floor: 10, status: "Available", unit: "1001", type: "3 BHK", views: ["Garden"], price: 24200000, area: 2100, facing: "North", amenities: ["Rooftop Garden"], reraNumber: "PR/GJ/AHMEDABAD/AUDA/CAA00123/251226", constructionStatus: "Slab Completed", brochure: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf", floorPlan: "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=600&q=80", virtualTour: "https://demo.virtualtour.com/skyview" },
  { tower: "Tower A", floor: 10, status: "Booked", unit: "1002", type: "3 BHK", views: ["Skyline"], price: 24300000, area: 2100, facing: "East", amenities: ["Rooftop Garden"], reraNumber: "PR/GJ/AHMEDABAD/AUDA/CAA00123/251226", constructionStatus: "Slab Completed", brochure: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf", floorPlan: "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=600&q=80", virtualTour: "https://demo.virtualtour.com/skyview" },
  { tower: "Tower A", floor: 8, status: "Available", unit: "801", type: "3 BHK", views: ["Garden"], price: 23800000, area: 2050, facing: "East", amenities: ["Double-Height Lounge"], reraNumber: "PR/GJ/AHMEDABAD/AUDA/CAA00123/251226", constructionStatus: "Slab Completed", brochure: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf", floorPlan: "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=600&q=80", virtualTour: "https://demo.virtualtour.com/skyview" },
  { tower: "Tower A", floor: 8, status: "Sold", unit: "802", type: "3 BHK", views: ["Pool"], price: 23900000, area: 2050, facing: "North", amenities: ["Double-Height Lounge"], reraNumber: "PR/GJ/AHMEDABAD/AUDA/CAA00123/251226", constructionStatus: "Slab Completed", brochure: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf", floorPlan: "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=600&q=80", virtualTour: "https://demo.virtualtour.com/skyview" },

  // Highlife Tower B
  { tower: "Tower B", floor: 5, status: "Available", unit: "501", type: "3 BHK", views: ["Garden"], price: 18000000, area: 1750, facing: "South", amenities: ["Clubhouse Lounge", "Gymnasium"], reraNumber: "PR/GJ/AHMEDABAD/AUDA/CAA00456/150124", constructionStatus: "Ready", brochure: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf", floorPlan: "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=600&q=80", virtualTour: "https://demo.virtualtour.com/highlife" },
  { tower: "Tower B", floor: 5, status: "Available", unit: "502", type: "3 BHK", views: ["Clubhouse"], price: 18200000, area: 1770, facing: "East", amenities: ["Clubhouse Lounge", "Children Play Area"], reraNumber: "PR/GJ/AHMEDABAD/AUDA/CAA00456/150124", constructionStatus: "Ready", brochure: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf", floorPlan: "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=600&q=80", virtualTour: "https://demo.virtualtour.com/highlife" },
  { tower: "Tower B", floor: 6, status: "Booked", unit: "601", type: "3 BHK", views: ["Clubhouse"], price: 18400000, area: 1770, facing: "North", amenities: ["Clubhouse Lounge"], reraNumber: "PR/GJ/AHMEDABAD/AUDA/CAA00456/150124", constructionStatus: "Ready", brochure: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf", floorPlan: "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=600&q=80", virtualTour: "https://demo.virtualtour.com/highlife" },
  { tower: "Tower B", floor: 6, status: "Available", unit: "602", type: "3 BHK", views: ["City Skyline"], price: 18500000, area: 1790, facing: "East", amenities: ["Clubhouse Lounge", "Gymnasium"], reraNumber: "PR/GJ/AHMEDABAD/AUDA/CAA00456/150124", constructionStatus: "Ready", brochure: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf", floorPlan: "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=600&q=80", virtualTour: "https://demo.virtualtour.com/highlife" },
  { tower: "Tower B", floor: 7, status: "Available", unit: "701", type: "3 BHK", views: ["Garden"], price: 18600000, area: 1800, facing: "East", amenities: ["Cricket Pitch"], reraNumber: "PR/GJ/AHMEDABAD/AUDA/CAA00456/150124", constructionStatus: "Ready", brochure: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf", floorPlan: "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=600&q=80", virtualTour: "https://demo.virtualtour.com/highlife" },
  { tower: "Tower B", floor: 7, status: "Available", unit: "702", type: "3 BHK", views: ["City Skyline"], price: 18700000, area: 1800, facing: "North", amenities: ["Cricket Pitch"], reraNumber: "PR/GJ/AHMEDABAD/AUDA/CAA00456/150124", constructionStatus: "Ready", brochure: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf", floorPlan: "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=600&q=80", virtualTour: "https://demo.virtualtour.com/highlife" },
  { tower: "Tower B", floor: 8, status: "Available", unit: "801", type: "3 BHK", views: ["Garden"], price: 18800000, area: 1820, facing: "East", amenities: ["Clubhouse Lounge"], reraNumber: "PR/GJ/AHMEDABAD/AUDA/CAA00456/150124", constructionStatus: "Ready", brochure: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf", floorPlan: "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=600&q=80", virtualTour: "https://demo.virtualtour.com/highlife" },
  { tower: "Tower B", floor: 8, status: "Sold", unit: "802", type: "3 BHK", views: ["Clubhouse"], price: 18900000, area: 1820, facing: "South", amenities: ["Gymnasium"], reraNumber: "PR/GJ/AHMEDABAD/AUDA/CAA00456/150124", constructionStatus: "Ready", brochure: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf", floorPlan: "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=600&q=80", virtualTour: "https://demo.virtualtour.com/highlife" },

  // Edge Tower C
  { tower: "Tower C", floor: 3, status: "Available", unit: "301", type: "2 BHK", views: ["Central Courtyard"], price: 11500000, area: 1250, facing: "East", amenities: ["Co-working Space", "Jogging Track"], reraNumber: "PR/GJ/AHMEDABAD/AUDA/CAA00789/300327", constructionStatus: "Foundation Ready", brochure: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf", floorPlan: "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=600&q=80", virtualTour: "https://demo.virtualtour.com/edge" },
  { tower: "Tower C", floor: 3, status: "Available", unit: "302", type: "2 BHK", views: ["Green Belt"], price: 11800000, area: 1280, facing: "North", amenities: ["Mini Theater"], reraNumber: "PR/GJ/AHMEDABAD/AUDA/CAA00789/300327", constructionStatus: "Foundation Ready", brochure: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf", floorPlan: "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=600&q=80", virtualTour: "https://demo.virtualtour.com/edge" },
  { tower: "Tower C", floor: 4, status: "Available", unit: "401", type: "3 BHK", views: ["Central Courtyard"], price: 13500000, area: 1550, facing: "East", amenities: ["EV Charging", "Pet Park"], reraNumber: "PR/GJ/AHMEDABAD/AUDA/CAA00789/300327", constructionStatus: "Foundation Ready", brochure: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf", floorPlan: "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=600&q=80", virtualTour: "https://demo.virtualtour.com/edge" },
  { tower: "Tower C", floor: 4, status: "Available", unit: "402", type: "3 BHK", views: ["City Lights"], price: 13800000, area: 1580, facing: "West", amenities: ["Co-working Space"], reraNumber: "PR/GJ/AHMEDABAD/AUDA/CAA00789/300327", constructionStatus: "Foundation Ready", brochure: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf", floorPlan: "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=600&q=80", virtualTour: "https://demo.virtualtour.com/edge" },
  { tower: "Tower C", floor: 5, status: "Booked", unit: "501", type: "3 BHK", views: ["Green Belt"], price: 14000000, area: 1600, facing: "North-East", amenities: ["Mini Theater"], reraNumber: "PR/GJ/AHMEDABAD/AUDA/CAA00789/300327", constructionStatus: "Foundation Ready", brochure: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf", floorPlan: "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=600&q=80", virtualTour: "https://demo.virtualtour.com/edge" },
  { tower: "Tower C", floor: 5, status: "Available", unit: "502", type: "3 BHK", views: ["Central Courtyard"], price: 14200000, area: 1600, facing: "East", amenities: ["Pet Park"], reraNumber: "PR/GJ/AHMEDABAD/AUDA/CAA00789/300327", constructionStatus: "Foundation Ready", brochure: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf", floorPlan: "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=600&q=80", virtualTour: "https://demo.virtualtour.com/edge" },
  { tower: "Tower C", floor: 6, status: "Available", unit: "601", type: "2 BHK", views: ["Green Belt"], price: 12200000, area: 1300, facing: "North", amenities: ["EV Charging"], reraNumber: "PR/GJ/AHMEDABAD/AUDA/CAA00789/300327", constructionStatus: "Foundation Ready", brochure: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf", floorPlan: "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=600&q=80", virtualTour: "https://demo.virtualtour.com/edge" },
  { tower: "Tower C", floor: 6, status: "Available", unit: "602", type: "2 BHK", views: ["Courtyard"], price: 12400000, area: 1320, facing: "East", amenities: ["Jogging Track"], reraNumber: "PR/GJ/AHMEDABAD/AUDA/CAA00789/300327", constructionStatus: "Foundation Ready", brochure: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf", floorPlan: "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=600&q=80", virtualTour: "https://demo.virtualtour.com/edge" }
];

const INITIAL_LEADS = [
  // Booked / Possession / Registration Deals (High Revenue / Strong conversion rate)
  {
    name: "Dr. Rajeshwar Rao",
    phone: "+91 98450 12345",
    email: "rajeshwar.rao@apollo.org",
    project: "Ai RealEstate OS Skyview",
    score: 96,
    status: "Booked",
    action: "Registry documentation ready",
    source: "Channel Partner VIP",
    budget: 37500000,
    preferredLocation: "Ambawadi",
    propertyType: "Apartment",
    bhkPreference: "4 BHK",
    purpose: "Buy",
    loanRequired: false,
    assignedExecutive: "Sujal Talreja",
    familyDetails: "Cardiologist & Surgeon Spouse",
    occupation: "Senior Chief Cardiologist",
    annualIncome: 14000000,
    notes: "Unit 1402 Penthouse booked. Token and first milestone paid in full."
  },
  {
    name: "Kavita Singhania",
    phone: "+91 98111 55443",
    email: "kavita@singhaniaexports.in",
    project: "Ai RealEstate OS Highlife",
    score: 94,
    status: "Booked",
    action: "Send agreement copies",
    source: "Broker Network",
    budget: 18400000,
    preferredLocation: "SG Highway",
    propertyType: "Apartment",
    bhkPreference: "3 BHK",
    purpose: "Buy",
    loanRequired: false,
    assignedExecutive: "Aarti Amin",
    familyDetails: "Family of 4",
    occupation: "Managing Director (Textiles)",
    annualIncome: 9500000,
    notes: "Unit 601 booked. Completed 20% booking milestone."
  },
  {
    name: "Harish Trivedi",
    phone: "+91 97240 88990",
    email: "harish.trivedi@techcorp.com",
    project: "Ai RealEstate OS Edge",
    score: 91,
    status: "Booked",
    action: "Prepare bank loan disbursement",
    source: "Corporate Tie-up",
    budget: 14000000,
    preferredLocation: "Bopal",
    propertyType: "Apartment",
    bhkPreference: "3 BHK",
    purpose: "Buy",
    loanRequired: true,
    assignedExecutive: "Rohan Vora",
    familyDetails: "Spouse & 2 Children",
    occupation: "VP Engineering",
    annualIncome: 6500000,
    notes: "Unit 501 booked. SBI Home Loan approved at 8.4%."
  },
  {
    name: "Bhavin Choksi",
    phone: "+91 99099 33221",
    email: "bhavin@choksifinance.com",
    project: "Ai RealEstate OS Skyview",
    score: 95,
    status: "Booked",
    action: "Final interior walkthrough",
    source: "Direct Referral",
    budget: 24300000,
    preferredLocation: "Ambawadi",
    propertyType: "Apartment",
    bhkPreference: "3 BHK",
    purpose: "Buy",
    loanRequired: false,
    assignedExecutive: "Sujal Talreja",
    familyDetails: "Family of 3",
    occupation: "Chartered Accountant / Investor",
    annualIncome: 8200000,
    notes: "Unit 1002 booked. Full payment made via RTGS."
  },

  // Negotiation Stage Deals
  {
    name: "Rahul Sharma",
    phone: "+91 98765 43210",
    email: "rahul.s@example.com",
    project: "Ai RealEstate OS Skyview",
    score: 92,
    status: "Negotiation",
    action: "Follow up on pricing discount",
    source: "Website Chat",
    budget: 25000000,
    preferredLocation: "Ambawadi",
    propertyType: "Apartment",
    bhkPreference: "3 BHK",
    purpose: "Buy",
    loanRequired: true,
    assignedExecutive: "Sujal Talreja",
    familyDetails: "Spouse and 1 Child",
    occupation: "Software Architect",
    annualIncome: 4500000,
    notes: "Negotiating on Unit 1201. Requesting waived club maintenance fees."
  },
  {
    name: "Manish Agarwal",
    phone: "+91 98300 44112",
    email: "m.agarwal@agarwalsteel.com",
    project: "Ai RealEstate OS Skyview",
    score: 89,
    status: "Negotiation",
    action: "Discuss milestone 10:90 scheme",
    source: "Direct Walk-in",
    budget: 34000000,
    preferredLocation: "Ambawadi",
    propertyType: "Apartment",
    bhkPreference: "4 BHK",
    purpose: "Buy",
    loanRequired: false,
    assignedExecutive: "Sujal Talreja",
    familyDetails: "Spouse, Mother, 2 Kids",
    occupation: "Industrialist",
    annualIncome: 12000000,
    notes: "Eyeing Unit 1204 4BHK. Ready to pay 30% upfront if possession moved up."
  },
  {
    name: "Sanjay Kothari",
    phone: "+91 98200 66778",
    email: "sanjay.kothari@diamondhub.com",
    project: "Ai RealEstate OS Signature Villas",
    score: 90,
    status: "Negotiation",
    action: "Send customized villa layout",
    source: "HNI Wealth Desk",
    budget: 52000000,
    preferredLocation: "Sindhu Bhavan",
    propertyType: "Villa",
    bhkPreference: "5 BHK",
    purpose: "Buy",
    loanRequired: false,
    assignedExecutive: "Sujal Talreja",
    familyDetails: "Joint family",
    occupation: "Diamond Merchant",
    annualIncome: 25000000,
    notes: "High value deal. Evaluating private terrace jacuzzi options."
  },

  // Site Visit Scheduled & Visited Stage
  {
    name: "Priya Patel",
    phone: "+91 98222 11100",
    email: "priya.p@example.com",
    project: "Ai RealEstate OS Highlife",
    score: 85,
    status: "Site Visit Scheduled",
    action: "Schedule AR Tour & Cab",
    source: "Facebook Ads",
    budget: 18000000,
    preferredLocation: "SG Highway",
    propertyType: "Apartment",
    bhkPreference: "3 BHK",
    purpose: "Buy",
    loanRequired: false,
    assignedExecutive: "Aarti Amin",
    familyDetails: "Joint family (Parents and spouse)",
    occupation: "Business Owner",
    annualIncome: 6000000,
    notes: "Wants a peaceful view of clubhouse. Prefers early possession."
  },
  {
    name: "Dr. Ananya Sen",
    phone: "+91 98310 99881",
    email: "ananya.sen@maxhealthcare.in",
    project: "Ai RealEstate OS Skyview",
    score: 87,
    status: "Site Visit Scheduled",
    action: "Executive cab dispatch 11:30 AM",
    source: "Google Ads",
    budget: 25000000,
    preferredLocation: "Ambawadi",
    propertyType: "Apartment",
    bhkPreference: "3 BHK",
    purpose: "Buy",
    loanRequired: true,
    assignedExecutive: "Sujal Talreja",
    familyDetails: "Spouse & Daughter",
    occupation: "Pediatrician",
    annualIncome: 5800000,
    notes: "Very interested in the rooftop garden and sunlight scores."
  },
  {
    name: "Deepak Somani",
    phone: "+91 98290 77112",
    email: "deepak.somani@logistics.co.in",
    project: "Ai RealEstate OS Highlife",
    score: 82,
    status: "Visited",
    action: "Send revised price quotation",
    source: "Broker Network",
    budget: 18500000,
    preferredLocation: "SG Highway",
    propertyType: "Apartment",
    bhkPreference: "3 BHK",
    purpose: "Buy",
    loanRequired: true,
    assignedExecutive: "Aarti Amin",
    familyDetails: "Parents and Wife",
    occupation: "Fleet Logistics Owner",
    annualIncome: 5200000,
    notes: "Completed physical visit yesterday. Loved Unit 602 view."
  },
  {
    name: "Sunita Reddy",
    phone: "+91 94400 33441",
    email: "sunita.reddy@pharma.org",
    project: "Ai RealEstate OS Edge",
    score: 81,
    status: "Visited",
    action: "Follow up on HDFC loan pre-approval",
    source: "LinkedIn Campaign",
    budget: 13500000,
    preferredLocation: "Bopal",
    propertyType: "Apartment",
    bhkPreference: "3 BHK",
    purpose: "Buy",
    loanRequired: true,
    assignedExecutive: "Rohan Vora",
    familyDetails: "Husband & 1 Child",
    occupation: "Quality Director (Pharma)",
    annualIncome: 4200000,
    notes: "Visited Bopal site on Sunday. Loved co-working and EV parking."
  },

  // Contacted Stage
  {
    name: "Amit Desai",
    phone: "+91 99888 77665",
    email: "amit.d@example.com",
    project: "Ai RealEstate OS Skyview",
    score: 78,
    status: "Contacted",
    action: "Send dynamic ROI calculator",
    source: "Google Search",
    budget: 28000000,
    preferredLocation: "Ambawadi",
    propertyType: "Apartment",
    bhkPreference: "4 BHK",
    purpose: "Invest",
    loanRequired: true,
    assignedExecutive: "Sujal Talreja",
    familyDetails: "Spouse only",
    occupation: "Doctor (Radiologist)",
    annualIncome: 7500000,
    notes: "Pure investment play. Looking for 7.5%+ rental yield."
  },
  {
    name: "Tarun Batra",
    phone: "+91 98100 44556",
    email: "tarun.batra@fintech.io",
    project: "Ai RealEstate OS Highlife",
    score: 75,
    status: "Contacted",
    action: "Send WhatsApp video tour",
    source: "Instagram Lead Form",
    budget: 18200000,
    preferredLocation: "SG Highway",
    propertyType: "Apartment",
    bhkPreference: "3 BHK",
    purpose: "Buy",
    loanRequired: true,
    assignedExecutive: "Aarti Amin",
    familyDetails: "Newly married couple",
    occupation: "Fintech Product Lead",
    annualIncome: 4800000,
    notes: "Wants modern amenities, clubhouse, high-speed fiber."
  },
  {
    name: "Meera Krishnan",
    phone: "+91 98400 11992",
    email: "meera.k@chennaicapital.com",
    project: "Ai RealEstate OS Skyview",
    score: 79,
    status: "Contacted",
    action: "Provide virtual NRI walkthrough",
    source: "NRI Outreach",
    budget: 35000000,
    preferredLocation: "Ambawadi",
    propertyType: "Apartment",
    bhkPreference: "4 BHK",
    purpose: "Invest",
    loanRequired: false,
    assignedExecutive: "Sujal Talreja",
    familyDetails: "Based in Dubai",
    occupation: "Private Equity Partner",
    annualIncome: 18000000,
    notes: "NRI buyer looking to acquire luxury property for portfolio."
  },

  // New Inbound Leads (Today)
  {
    name: "Neha Gupta",
    phone: "+91 91234 56789",
    email: "neha.g@example.com",
    project: "Ai RealEstate OS Highlife",
    score: 71,
    status: "New Lead",
    action: "Trigger AI voice qualification",
    source: "Instagram",
    budget: 16000000,
    preferredLocation: "SG Highway",
    propertyType: "Apartment",
    bhkPreference: "3 BHK",
    purpose: "Buy",
    loanRequired: true,
    assignedExecutive: "Rohan Vora",
    familyDetails: "Single",
    occupation: "Senior Consultant",
    annualIncome: 3200000,
    notes: "First-time buyer interested in modern community living."
  },
  {
    name: "Ravi Shankar Joshi",
    phone: "+91 98920 66554",
    email: "ravi.joshi@infra.gov.in",
    project: "Ai RealEstate OS Skyview",
    score: 74,
    status: "New Lead",
    action: "Send digital e-brochure",
    source: "Website Direct",
    budget: 25000000,
    preferredLocation: "Ambawadi",
    propertyType: "Apartment",
    bhkPreference: "3 BHK",
    purpose: "Buy",
    loanRequired: true,
    assignedExecutive: "Sujal Talreja",
    familyDetails: "Spouse & College Son",
    occupation: "Chief Engineer (PSU)",
    annualIncome: 3800000,
    notes: "Looking for central location close to universities."
  },
  {
    name: "Pooja Malhotra",
    phone: "+91 98180 22334",
    email: "pooja.malhotra@designstudio.in",
    project: "Ai RealEstate OS Edge",
    score: 68,
    status: "New Lead",
    action: "Call for preference capture",
    source: "Facebook Ads",
    budget: 12500000,
    preferredLocation: "Bopal",
    propertyType: "Apartment",
    bhkPreference: "2 BHK",
    purpose: "Buy",
    loanRequired: true,
    assignedExecutive: "Rohan Vora",
    familyDetails: "Single Professional",
    occupation: "Architect & Interior Designer",
    annualIncome: 2400000,
    notes: "Inquired about cross-ventilation and natural lighting."
  },
  {
    name: "Aditya Verma",
    phone: "+91 99300 77123",
    email: "aditya.verma@cloudscale.io",
    project: "Ai RealEstate OS Highlife",
    score: 72,
    status: "New Lead",
    action: "Schedule intro discovery call",
    source: "Google Search",
    budget: 18500000,
    preferredLocation: "SG Highway",
    propertyType: "Apartment",
    bhkPreference: "3 BHK",
    purpose: "Buy",
    loanRequired: false,
    assignedExecutive: "Aarti Amin",
    familyDetails: "Couple with toddler",
    occupation: "DevOps Director",
    annualIncome: 5500000,
    notes: "Prefers ready-to-move-in property with clubhouse."
  },

  // Closed / Lost Leads (Realistic historical records)
  {
    name: "Vikram Singh",
    phone: "+91 90000 11223",
    email: "vikram.s@example.com",
    project: "Ai RealEstate OS Edge",
    score: 45,
    status: "Closed/Lost",
    action: "Add to nurture campaign",
    source: "Walk-in",
    budget: 9500000,
    preferredLocation: "Bopal",
    propertyType: "Apartment",
    bhkPreference: "2 BHK",
    purpose: "Buy",
    loanRequired: true,
    assignedExecutive: "Aarti Amin",
    familyDetails: "Retired spouse",
    occupation: "Retired Bank Manager",
    annualIncome: 1200000,
    notes: "Budget constraint. Kept in quarterly newsletter drip."
  },
  {
    name: "Gaurav Parekh",
    phone: "+91 98250 33412",
    email: "gaurav.p@chemicals.com",
    project: "Ai RealEstate OS Skyview",
    score: 52,
    status: "Closed/Lost",
    action: "Re-engage in Q4 launch",
    source: "Broker Network",
    budget: 20000000,
    preferredLocation: "Vastrapur",
    propertyType: "Apartment",
    bhkPreference: "3 BHK",
    purpose: "Buy",
    loanRequired: false,
    assignedExecutive: "Sujal Talreja",
    familyDetails: "Family of 4",
    occupation: "Chemical Trader",
    annualIncome: 3500000,
    notes: "Decided to wait for Vastrapur project launch."
  }
];

const INITIAL_ACTIVITY = [
  { message: "Dr. Rajeshwar Rao executed booking agreement for Skyview Unit 1402 Penthouse (₹3.75 Cr).", time: "10:45 AM" },
  { message: "Payment milestone received: ₹75,00,000 for Unit 1002 from Bhavin Choksi.", time: "10:15 AM" },
  { message: "Site visit completed for Deepak Somani at Highlife. Feedback: Very High Interest.", time: "09:40 AM" },
  { message: "AI Voice Agent completed automated qualification with Neha Gupta (Score: 71).", time: "09:10 AM" },
  { message: "New inbound lead captured from Google Adwords: Ravi Shankar Joshi.", time: "08:30 AM" },
  { message: "Broker Rohan Mehta registered 3 new NRI high-net-worth buyer leads.", time: "Yesterday" }
];

const INITIAL_BUILDERS = [
  {
    name: "Ai RealEstate OS Group",
    company: "Ai RealEstate OS Projects Limited",
    contact: "+91 79 3500 1100",
    activeProjects: ["Ai RealEstate OS Skyview", "Ai RealEstate OS Highlife", "Ai RealEstate OS Edge", "Ai RealEstate OS Signature Villas"],
    commissionAgreement: "2.5% commission payout. 1% upon execution of allotment letter, 1.5% upon registration."
  },
  {
    name: "Legacy Developers",
    company: "Legacy Buildcon LLP",
    contact: "+91 79 4800 2200",
    activeProjects: ["Legacy Manor", "Legacy Heights", "Legacy Pinnacle"],
    commissionAgreement: "2.0% standard broker payout, disbursed within 30 days of client sale deed execution."
  },
  {
    name: "Prestige Urban Spaces",
    company: "Prestige Habitat India Ltd",
    contact: "+91 79 6600 8800",
    activeProjects: ["Prestige Lakeside", "Prestige Boulevard"],
    commissionAgreement: "3.0% early bird commission for first 20 units booked in pre-launch phase."
  }
];

const INITIAL_BROKERS = [
  {
    name: "Rohan Mehta",
    agency: "Amdavad Realty Experts",
    contact: "+91 98980 12345",
    reraNumber: "PR/GJ/AHMEDABAD/AG/110224",
    leadReferralsCount: 42,
    commissionEarned: 3250000,
    status: "Active"
  },
  {
    name: "Sonia Shah",
    agency: "Elite Spaces Realty",
    contact: "+91 97777 88888",
    reraNumber: "PR/GJ/AHMEDABAD/AG/550625",
    leadReferralsCount: 28,
    commissionEarned: 2180000,
    status: "Active"
  },
  {
    name: "Karan Johar",
    agency: "Dream Abodes",
    contact: "+91 91111 22222",
    reraNumber: "PR/GJ/AHMEDABAD/AG/990326",
    leadReferralsCount: 15,
    commissionEarned: 1150000,
    status: "Active"
  },
  {
    name: "Mehul Parekh",
    agency: "Gujarat Luxury Properties",
    contact: "+91 98251 44556",
    reraNumber: "PR/GJ/AHMEDABAD/AG/770419",
    leadReferralsCount: 36,
    commissionEarned: 2890000,
    status: "Active"
  },
  {
    name: "Anita Vaghela",
    agency: "Western Corridor Realty",
    contact: "+91 98982 77889",
    reraNumber: "PR/GJ/AHMEDABAD/AG/330112",
    leadReferralsCount: 19,
    commissionEarned: 1420000,
    status: "Active"
  }
];

const INITIAL_PAYMENTS = [
  // Substantial real estate transactions totaling over ₹24.5 Cr!
  {
    leadId: "placeholder",
    leadName: "Dr. Rajeshwar Rao",
    amount: 10000000, // 1.00 Cr
    date: "2026-10-10",
    stage: "Booking & Agreement Stage",
    status: "Paid",
    gstAmount: 1800000,
    receiptUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf"
  },
  {
    leadId: "placeholder",
    leadName: "Bhavin Choksi",
    amount: 7500000, // 75 L
    date: "2026-10-12",
    stage: "Structure Slab Completion",
    status: "Paid",
    gstAmount: 1350000,
    receiptUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf"
  },
  {
    leadId: "placeholder",
    leadName: "Kavita Singhania",
    amount: 3680000, // 36.8 L
    date: "2026-10-05",
    stage: "Token & Allotment Stage",
    status: "Paid",
    gstAmount: 662400,
    receiptUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf"
  },
  {
    leadId: "placeholder",
    leadName: "Harish Trivedi",
    amount: 2800000, // 28 L
    date: "2026-09-28",
    stage: "Plinth Level Completion",
    status: "Paid",
    gstAmount: 504000,
    receiptUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf"
  },
  {
    leadId: "placeholder",
    leadName: "Rahul Sharma",
    amount: 1500000, // 15 L
    date: "2026-10-02",
    stage: "Expression of Interest (EOI)",
    status: "Paid",
    gstAmount: 270000,
    receiptUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf"
  },
  {
    leadId: "placeholder",
    leadName: "Manish Agarwal",
    amount: 2000000, // 20 L
    date: "2026-10-11",
    stage: "Token Amount Paid",
    status: "Paid",
    gstAmount: 360000,
    receiptUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf"
  },
  {
    leadId: "placeholder",
    leadName: "Priya Patel",
    amount: 500000, // 5 L
    date: "2026-10-08",
    stage: "Advance Token",
    status: "Paid",
    gstAmount: 90000,
    receiptUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf"
  },
  {
    leadId: "placeholder",
    leadName: "Deepak Somani",
    amount: 1850000, // 18.5 L
    date: "2026-10-14",
    stage: "Token Allotment",
    status: "Pending",
    gstAmount: 333000,
    receiptUrl: ""
  },
  {
    leadId: "placeholder",
    leadName: "Dr. Rajeshwar Rao",
    amount: 15000000, // 1.5 Cr
    date: "2026-11-15",
    stage: "10th Slab Milestone",
    status: "Pending",
    gstAmount: 2700000,
    receiptUrl: ""
  }
];

const INITIAL_FOLLOWUPS = [
  {
    leadId: "placeholder",
    leadName: "Dr. Rajeshwar Rao",
    date: "2026-10-16",
    time: "11:00",
    task: "Coordinate final registration papers with Sub-Registrar office & execute sale deed.",
    status: "Pending",
    assignedTo: "Sujal Talreja"
  },
  {
    leadId: "placeholder",
    leadName: "Rahul Sharma",
    date: "2026-10-15",
    time: "14:30",
    task: "Present final waiver approval on club amenity charges to close Unit 1201.",
    status: "Pending",
    assignedTo: "Sujal Talreja"
  },
  {
    leadId: "placeholder",
    leadName: "Priya Patel",
    date: "2026-10-15",
    time: "16:00",
    task: "Confirm luxury cab pickup for parents' site walkthrough at Highlife.",
    status: "Pending",
    assignedTo: "Aarti Amin"
  },
  {
    leadId: "placeholder",
    leadName: "Manish Agarwal",
    date: "2026-10-16",
    time: "15:00",
    task: "Share construction progress report and structural architect certificate for Tower A.",
    status: "Pending",
    assignedTo: "Sujal Talreja"
  },
  {
    leadId: "placeholder",
    leadName: "Dr. Ananya Sen",
    date: "2026-10-17",
    time: "12:00",
    task: "Assist with SBI doctor special home loan rate documentation.",
    status: "Pending",
    assignedTo: "Sujal Talreja"
  },
  {
    leadId: "placeholder",
    leadName: "Amit Desai",
    date: "2026-10-17",
    time: "17:30",
    task: "Walk through commercial rental yield analysis and tenancy guarantee terms.",
    status: "Pending",
    assignedTo: "Sujal Talreja"
  },
  {
    leadId: "placeholder",
    leadName: "Deepak Somani",
    date: "2026-10-18",
    time: "10:30",
    task: "Finalize parking slot allocation on Basement 1 for Unit 602.",
    status: "Pending",
    assignedTo: "Aarti Amin"
  },
  {
    leadId: "placeholder",
    leadName: "Sunita Reddy",
    date: "2026-10-19",
    time: "14:00",
    task: "Review customized wooden flooring upgrades for Edge 3BHK.",
    status: "Pending",
    assignedTo: "Rohan Vora"
  }
];

const INITIAL_SITE_VISITS = [
  {
    leadId: "placeholder",
    date: "2026-10-15",
    time: "11:30",
    type: "Physical & AR Walkthrough",
    executive: "Sujal Talreja",
    cabRequired: true,
    pickupLocation: "Bodakdev, Ahmedabad",
    feedback: "High interest in East-facing morning sunlight and double-height lobby.",
    interestLevel: "Hot"
  },
  {
    leadId: "placeholder",
    date: "2026-10-15",
    time: "15:00",
    type: "Physical Visit",
    executive: "Aarti Amin",
    cabRequired: true,
    pickupLocation: "Prahlad Nagar, Ahmedabad",
    feedback: "Family visit with parents. Very impressed by club sports amenities.",
    interestLevel: "Hot"
  },
  {
    leadId: "placeholder",
    date: "2026-10-16",
    time: "10:00",
    type: "AR Interactive 3D Tour",
    executive: "Rohan Vora",
    cabRequired: false,
    pickupLocation: "",
    feedback: "Virtual walkthrough done. Requested customized kitchen specs.",
    interestLevel: "Warm"
  },
  {
    leadId: "placeholder",
    date: "2026-10-16",
    time: "16:30",
    type: "Physical Visit",
    executive: "Sujal Talreja",
    cabRequired: true,
    pickupLocation: "Satellite Circle, Ahmedabad",
    feedback: "Inspecting high-floor penthouse options and private terrace.",
    interestLevel: "Hot"
  },
  {
    leadId: "placeholder",
    date: "2026-10-17",
    time: "11:00",
    type: "Physical Visit",
    executive: "Aarti Amin",
    cabRequired: true,
    pickupLocation: "Vastrapur Lake, Ahmedabad",
    feedback: "Checking ready-to-move unit layout and club fitness center.",
    interestLevel: "Warm"
  },
  {
    leadId: "placeholder",
    date: "2026-10-18",
    time: "14:00",
    type: "AR Walkthrough",
    executive: "Rohan Vora",
    cabRequired: false,
    pickupLocation: "",
    feedback: "Evaluating Bopal connectivity and upcoming metro corridor.",
    interestLevel: "Warm"
  }
];

export const seedDatabase = mutation({
  args: {},
  handler: async (ctx) => {
    // 0. Clear existing data to allow clean rebuild
    const oldLeads = await ctx.db.query("leads").collect();
    for (const lead of oldLeads) {
      await ctx.db.delete(lead._id);
    }
    const oldProperties = await ctx.db.query("properties").collect();
    for (const prop of oldProperties) {
      await ctx.db.delete(prop._id);
    }
    const oldInventory = await ctx.db.query("inventory").collect();
    for (const inv of oldInventory) {
      await ctx.db.delete(inv._id);
    }
    const oldActivity = await ctx.db.query("activityStream").collect();
    for (const act of oldActivity) {
      await ctx.db.delete(act._id);
    }
    const oldBuilders = await ctx.db.query("builders").collect();
    for (const bld of oldBuilders) {
      await ctx.db.delete(bld._id);
    }
    const oldBrokers = await ctx.db.query("brokers").collect();
    for (const brk of oldBrokers) {
      await ctx.db.delete(brk._id);
    }
    const oldPayments = await ctx.db.query("payments").collect();
    for (const pay of oldPayments) {
      await ctx.db.delete(pay._id);
    }
    const oldFollowups = await ctx.db.query("followups").collect();
    for (const f of oldFollowups) {
      await ctx.db.delete(f._id);
    }
    const oldSiteVisits = await ctx.db.query("siteVisits").collect();
    for (const sv of oldSiteVisits) {
      await ctx.db.delete(sv._id);
    }

    // 1. Seed properties
    for (const property of INITIAL_PROPERTIES) {
      await ctx.db.insert("properties", property);
    }

    // 2. Seed inventory
    for (const item of INITIAL_INVENTORY) {
      await ctx.db.insert("inventory", item);
    }

    // 3. Seed builders & brokers
    for (const builder of INITIAL_BUILDERS) {
      await ctx.db.insert("builders", builder);
    }
    for (const broker of INITIAL_BROKERS) {
      await ctx.db.insert("brokers", broker);
    }

    // 4. Seed activity
    for (const activity of INITIAL_ACTIVITY) {
      await ctx.db.insert("activityStream", activity);
    }

    // 5. Seed leads and capture their IDs dynamically for payments/followups/visits
    const leadIds: Record<string, string> = {};
    for (const lead of INITIAL_LEADS) {
      const id = await ctx.db.insert("leads", lead);
      leadIds[lead.name] = id;
    }

    // 6. Seed payments with real lead references
    for (const payment of INITIAL_PAYMENTS) {
      const matchedId = leadIds[payment.leadName] || "";
      await ctx.db.insert("payments", {
        ...payment,
        leadId: matchedId
      });
    }

    // 7. Seed followups with real lead references
    for (const followup of INITIAL_FOLLOWUPS) {
      const matchedId = leadIds[followup.leadName] || "";
      await ctx.db.insert("followups", {
        ...followup,
        leadId: matchedId
      });
    }

    // 8. Seed site visits
    for (const visit of INITIAL_SITE_VISITS) {
      const sampleLeadName = Object.keys(leadIds)[0];
      const matchedId = leadIds[sampleLeadName] || "";
      await ctx.db.insert("siteVisits", {
        ...visit,
        leadId: matchedId
      });
    }

    return "Database seeded with rich real-estate enterprise records successfully!";
  }
});
