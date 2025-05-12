const express = require('express');
const axios = require('axios');
const app = express();
const port = 9876;

const windowSize = 10;
let window = [];
const windowResetInterval = 60 * 60 * 1000;
let lastResetTime = Date.now();

const ACCESS_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJNYXBDbGFpbXMiOnsiZXhwIjoxNzQ3MDMxMzE1LCJpYXQiOjE3NDcwMzEwMTUsImlzcyI6IkFmZm9yZG1lZCIsImp0aSI6IjM2ZWVlY2M0LTBjNmUtNDhlZC1hYTEyLTliMDk3YTU3MTJiOCIsInN1YiI6ImRpbmVzaGthcnRoaWtyYWphbmQuMjJjc2VAa29uZ3UuZWR1In0sImVtYWlsIjoiZGluZXNoa2FydGhpa3JhamFuZC4yMmNzZUBrb25ndS5lZHUiLCJuYW1lIjoiZGluZXNoIGthcnRoaWsgcmFqYW4gZCIsInJvbGxObyI6IjIyY3NyMDQ5IiwiYWNjZXNzQ29kZSI6ImptcFphRiIsImNsaWVudElEIjoiMzZlZWVjYzQtMGM2ZS00OGVkLWFhMTItOWIwOTdhNTcxMmI4IiwiY2xpZW50U2VjcmV0IjoiVFNxZWZEUkttQ3ByQWJjYyJ9.g65XzEvdjDGB1ivNtrjcDLROhYFw-pA1avbhL4KPIdc"; 

async function fetchNumbers(type) {
  const apiUrls = {
    p: 'http://20.244.56.144/evaluation-service/primes',
    f: 'http://20.244.56.144/evaluation-service/fibo',
    e: 'http://20.244.56.144/evaluation-service/even',
    r: 'http://20.244.56.144/evaluation-service/rand'
  };

  try {
    const response = await axios.get(apiUrls[type], {
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
      },
      timeout: 500,
    });
    return response.data.numbers;
  } catch (error) {
    console.error('Error fetching numbers:', error.message);

    if (error.response) {
      console.error('Server responded with:', error.response.status);
    } else if (error.request) {
      console.error('No response received:', error.request);
    }

    return []; 
  }
}

function calculateAverage(numbers) {
  if (numbers.length === 0) return 0;
  const sum = numbers.reduce((acc, num) => acc + num, 0);
  return (sum / numbers.length).toFixed(2);
}

function resetWindowIfNeeded() {
  const now = Date.now();
  if (now - lastResetTime >= windowResetInterval) {
    window = [];
    lastResetTime = now;
  }
}

app.get('/numbers/:numberid', async (req, res) => {
  const numberId = req.params.numberid;

  if (!['p', 'f', 'e', 'r'].includes(numberId)) {
    return res.status(400).json({ error: 'Invalid number ID. Valid IDs are: p, f, e, r.' });
  }

  const numbers = await fetchNumbers(numberId);

  if (numbers.length === 0) {
    return res.status(500).json({
      windowPrevState: window,
      windowCurrState: window,
      numbers: [],
      avg: calculateAverage(window),
      count: window.length,
    });
  }

  const newNumbers = [...new Set([...window, ...numbers])];

  if (newNumbers.length > windowSize) {
    newNumbers.splice(0, newNumbers.length - windowSize); 
  }

  const avg = calculateAverage(newNumbers);

  const response = {
    windowPrevState: window, 
    windowCurrState: newNumbers, 
    numbers: numbers, 
    avg: parseFloat(avg),
    count: newNumbers.length,
  };

  window = newNumbers;
  resetWindowIfNeeded();
  
  res.json(response);
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
