const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'brcs.json');
const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

const DISTRICT_MAPPING = {
  "ALAPPUZHA": ["ALAPPUZHA", "AMBALAPPUZHA", "CHENGANNUR", "CHERTHALA", "HARIPPAD", "KAYAMKULAM", "MAVELIKKARA", "MONCOMPU", "THALAVADY", "THURAVOOR", "VELIYANADU"],
  "ERNAKULAM": ["ALUVA", "ANGAMALY", "ERNAKULAM", "KOLENCHERY", "KOOTHATTUKULAM", "KOTHAMANGALAM", "MATTANCHERY", "MUVATTUPUZHA", "N. PARAVOOR", "PERUMABVOOR", "PIRAVOM", "TRIPUNITHURA", "VYPIN", "KOOVAPPADY", "KALLOORKKAD"],
  "KANNUR": ["CHOKLI", "IRIKKUR", "IRITTY", "KANNUR NORTH", "KANNUR SOUTH", "KUTHUPARAMBA", "MADAYI", "MATTANNUR", "PANOOR", "PAPPINISSERY", "PAYYANNUR", "THALASSERY NORTH", "THALASSERY SOUTH", "THALIPARAMBA NORTH", "THALIPARAMBA SOUTH PALAKKAD"],
  "PALAKKAD": ["AGALI", "PARALI", "ALATHUR", "CHERPPULASSERY", "CHITTUR", "KOLLENGODE", "KUZHALMANNAM", "MANNARKKAD", "OTTAPPALAM", "PALAKKAD", "PATTAMBI", "SHORANUR", "THRITHALA"],
  "MALAPPURAM": ["AREACODE", "EDAPPAL", "KONDOTTY", "KUTTIPPURAM", "MALAPPURAM", "MANJERI", "MANKADA", "NILAMBUR", "PARAPPANANGADI", "PERINTALMANNA", "PONNANI", "TANUR", "TIRUR", "VENGARA", "WANDOOR"],
  "THRISSUR": ["ANTHIKKAD", "CHALAKUDY", "CHAVAKKAD", "CHERPU", "CHOWANNUR", "IRINJALAKUDA", "KODAKARA", "KODUNGALLUR", "MALA", "MATHILAKAM", "MULLASSERY", "OLLUKKARA", "PAZHAYANNUR", "THALIKULAM", "URC THRISSUR", "WADAKKANCHERY", "VELLANGALLUR"]
};

// Create a reverse map for quick lookup
const locationToDistrict = {};
for (const [district, locations] of Object.entries(DISTRICT_MAPPING)) {
  for (const loc of locations) {
    locationToDistrict[loc] = district;
  }
}

let modified = 0;
const newData = data.map(brc => {
  if (!brc.district) {
    const district = locationToDistrict[brc.location] || "UNKNOWN";
    modified++;
    return { ...brc, district };
  }
  return brc;
});

fs.writeFileSync(filePath, JSON.stringify(newData, null, 2));
console.log(`Updated ${modified} BRCs with district information.`);
