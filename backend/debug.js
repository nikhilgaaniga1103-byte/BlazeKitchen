const axios = require('axios');

const test = async () => {
  try {
    const response = await axios.get('http://localhost:5000/api/menu?limit=200');
    console.log('Full response:', JSON.stringify(response.data, null, 2).substring(0, 500));
    console.log('\nresponse.data keys:', Object.keys(response.data));
    console.log('response.data.data type:', typeof response.data.data);
    console.log('is array?', Array.isArray(response.data.data));
    if (Array.isArray(response.data.data)) {
      console.log('Array length:', response.data.data.length);
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
};

test();
