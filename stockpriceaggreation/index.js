const express = require('express');
const app = express();
const axios = require('axios');

const PORT = 9876;
const BASE_URL = 'http://20.244.56.144/test/stocks';

app.get('/stocks/:ticker/price', async (req, res) => {
  const { ticker } = req.params;
  const { minutes, aggregation } = req.query;

  if (!minutes || !aggregation) {
    return res.status(400).json({ message: 'Missing query parameters' });
  }

  try {
    const { data } = await axios.get(`${BASE_URL}?ticker=${ticker}`);
    const now = Date.now();
    const windowStart = now - minutes * 60 * 1000;

    const filtered = data.filter(item => item.timestamp >= windowStart);

    if (filtered.length === 0) {
      return res.json({ message: 'No data found in the given time window' });
    }

    const prices = filtered.map(item => item.price);
    let value;

    if (aggregation === 'average') {
      value = prices.reduce((a, b) => a + b, 0) / prices.length;
    } else if (aggregation === 'min') {
      value = Math.min(...prices);
    } else if (aggregation === 'max') {
      value = Math.max(...prices);
    } else {
      return res.status(400).json({ message: 'Invalid aggregation method' });
    }

    res.json({ ticker, aggregation, value: Number(value.toFixed(2)) });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching stock data', error: err.message });
  }
});

app.get('/stockcorrelation', async (req, res) => {
  const { ticker: tickers, minutes } = req.query;

  if (!tickers || tickers.length !== 2 || !minutes) {
    return res.status(400).json({ message: 'Invalid or missing query parameters' });
  }

  const [ticker1, ticker2] = tickers;

  try {
    const [data1, data2] = await Promise.all([
      axios.get(`${BASE_URL}?ticker=${ticker1}`),
      axios.get(`${BASE_URL}?ticker=${ticker2}`)
    ]);

    const now = Date.now();
    const windowStart = now - minutes * 60 * 1000;

    const prices1 = data1.data.filter(p => p.timestamp >= windowStart);
    const prices2 = data2.data.filter(p => p.timestamp >= windowStart);

    if (prices1.length === 0 || prices2.length === 0 || prices1.length !== prices2.length) {
      return res.json({ message: 'Insufficient data to compute correlation' });
    }

    const n = Math.min(prices1.length, prices2.length);
    const x = prices1.slice(0, n).map(p => p.price);
    const y = prices2.slice(0, n).map(p => p.price);

    const mean = arr => arr.reduce((a, b) => a + b, 0) / arr.length;
    const xBar = mean(x);
    const yBar = mean(y);

    const numerator = x.reduce((sum, xi, i) => sum + (xi - xBar) * (y[i] - yBar), 0);
    const denomX = Math.sqrt(x.reduce((sum, xi) => sum + (xi - xBar) ** 2, 0));
    const denomY = Math.sqrt(y.reduce((sum, yi) => sum + (yi - yBar) ** 2, 0));

    const correlation = numerator / (denomX * denomY);

    res.json({
      ticker1,
      ticker2,
      correlation: Number(correlation.toFixed(2))
    });
  } catch (err) {
    res.status(500).json({ message: 'Error computing correlation', error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Stock Aggregator running on port ${PORT}`);
});
