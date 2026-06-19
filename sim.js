const brcs = [
  { code: 'B1', name: 'BRC1', district: 'D1' },
  { code: 'B2', name: 'BRC2', district: 'D2' }
];

let createForm = { district: [], brc: [] };

const setCreateForm = (newState) => {
  createForm = newState;
  console.log('State updated:', createForm);
};

const handleDistrictChange = (newDistricts, currentBrcs, updateFormState) => {
  const validBrcs = (currentBrcs || []).filter(brcCode => {
    const brcObj = brcs.find(b => b.code === brcCode);
    return brcObj && newDistricts.includes(brcObj.district);
  });
  updateFormState(newDistricts, newDistricts.length === 0 ? [] : validBrcs);
};

// User selects All BRCs
const BrcOnChange = (newSelected) => {
  const selectedDistricts = new Set(createForm.district || []);
  newSelected.forEach(brcCode => {
    const brcObj = brcs.find(b => b.code === brcCode);
    if (brcObj && brcObj.district) {
      selectedDistricts.add(brcObj.district);
    }
  });
  setCreateForm({...createForm, brc: newSelected, district: Array.from(selectedDistricts)});
};

console.log('1. User selects All BRCs');
BrcOnChange(['B1', 'B2']);

// User removes D1
console.log('2. User removes D1');
const DistrictOnChange = (newSelected) => {
  handleDistrictChange(newSelected, createForm.brc, (d, b) => setCreateForm({...createForm, district: d, brc: b}));
};

DistrictOnChange(['D2']);

// User removes D2 (all districts closed)
console.log('3. User removes D2');
DistrictOnChange([]);
