'use strict';

// imports
import { runBacktester } from './backtester.js';

// cache jquery selectors
const $starterStrategyButton = $('#starter-strategy-button');
const $customStrategyButton = $('#custom-strategy-button');
const $symbol = $('#symbol');
const $lookback = $('#lookback');
const $volatility = $('#volatility');
const $leverage = $('#leverage');
const $shorting = $('#shorting');
const $message = $('.message');
const $currentPosition = $('#current-position');
const $allocationChart = $('#allocation-chart');
const $backtestChart = $('#backtest-chart');

// set global chart objects to null.
// UI displays empty charts on page load.
let allocationChart = null;
let backtestChart = null;

// cache market data fetched from alphavantage api
const dataCache = new Map();

// write the trend following strategy results to DOM
const displayResults = (symbol, strategyData) => {
  $currentPosition.empty();
  //$allocationChart.remove();
  //$allocationContainer.append('<canvas id="allocation-chart"></canvas>');
  //$backtestChart.remove();
  //$backtestContainer.append('<canvas id="backtest-chart" aspectRatio="3"></canvas>');
  $message.empty();

  const dates = strategyData.dates;
  const benchmark = strategyData.totalReturns;
  const strategy = strategyData.rangeScaledTotalReturns;
  const position = strategyData.position;
  const closes = strategyData.closes;

  const positionSize =
    Math.round(((10000 * position) / closes[closes.length - 1]) * 100) / 100;

  console.log(position, positionSize, closes[closes.length - 1]);

  //
  $currentPosition.html(
    'For a $10000 account, you should own ' + positionSize + '' + symbol
  );

  if (allocationChart !== null) allocationChart.destroy();
  if (backtestChart !== null) backtestChart.destroy();

  console.log(document.getElementById('allocation-chart'), $allocationChart);

  const allocationCtx = $allocationChart[0].getContext('2d');
  //const allocationCtx = document.getElementById('allocation-chart').getContext('2d');
  allocationChart = new Chart(allocationCtx, {
    type: 'pie',
    data: {
      datasets: [
        {
          data: [position, 1 - position],
          backgroundColor: ['#0074d9', '#e6f1fc'],
        },
      ],
      // These labels appear in the legend and in the tooltips when hovering different arcs
      labels: ['Coin', 'USD'],
    },
  });

  const backtestCtx = $backtestChart[0].getContext('2d');
  //const backtestCtx = document.getElementById('backtest-chart').getContext('2d');
  backtestChart = new Chart(backtestCtx, {
    type: 'line',
    data: {
      labels: dates,
      datasets: [
        {
          label: 'Trend Following',
          fill: false,
          backgroundColor: 'blue',
          borderColor: '#0074d9',
          data: strategy,
        },
        {
          label: 'HODL',
          backgroundColor: '#f8fbfe',
          borderColor: '#cfe4f9',
          data: benchmark,
          fill: true,
        },
      ],
    },
    options: {
      scales: {
        yAxes: [
          {
            ticks: {
              beginAtZero: true,
            },
            type: 'linear',
          },
        ],
      },
    },
  });
};

// transform fetched data into input for backtester
const mungeData = (responseJSON) => {
  let extractedData = responseJSON['Time Series (Digital Currency Daily)'];
  console.log(responseJSON, extractedData);

  const dates = [];
  const closes = [];

  Object.keys(extractedData)
    .reverse()
    .forEach((date) => {
      dates.push(date), closes.push(extractedData[date]['4a. close (USD)']);
    });
  /*
  for (const record in extractedData) {
    dates.push(record), closes.push(extractedData[record]['4a. close (USD)']);
  }*/
  return { dates, closes };
};

// fetch data from alphavantage api
const fetchData = async (symbol, lookback, volatility, leverage, shorting) => {
  const apiKey = 'CFJ6KI5OO7G7X6QA';
  const searchURL = 'https://www.alphavantage.co/query';
  const params = {
    function: 'DIGITAL_CURRENCY_DAILY',
    symbol: symbol,
    market: 'USD',
    apikey: apiKey,
    datatype: 'json',
  };

  const queryString = Object.keys(params)
    .map(
      (key) => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`
    )
    .join('&');

  const url = searchURL + '?' + queryString;

  console.log(url);

  try {
    const response = await fetch(url);
    if (response.ok) {
      const responseJSON = response.json();
      return responseJSON;
    }
    throw new Error(response.statusText);
  } catch (error) {
    $message.html(`Something went wrong: ${error.message}`);
  }
};

// handle form submissions
const handleFormSubmit = async (event) => {
  event.preventDefault();

  $message.text(`Loading. Please wait.`); // write loading message to DOM

  let symbol, lookback, volatility, leverage, shorting;

  symbol = $symbol.val();

  if (event.target.id === 'starter-strategy-button') {
    //get form inputs and do fallback form validation
    lookback = 260;
    volatility = 0.65;
    leverage = 1;
    shorting = false;
    $starterStrategyButton.one('click', handleFormSubmit);
  } else if (event.target.id === 'custom-strategy-button') {
    // get form inputs and do fallback form validation
    lookback = parseInt($lookback.val());
    if (!lookback || lookback.length < 1) return;

    volatility = Number($volatility.val());
    if (!volatility || volatility.length < 1) return;

    leverage = parseInt($leverage.val());
    if (!leverage || leverage.length < 1) return;

    shorting = $shorting.is(':checked');
    if (shorting.length < 1) return;
    $customStrategyButton.one('click', handleFormSubmit);
  }

  const dataCached = dataCache.has(symbol);
  console.log('is data cached?', dataCached);

  // get market data from cache or fetch it from api
  let historicalData;
  if (dataCached) {
    historicalData = dataCache.get(symbol);
  } else {
    historicalData = await fetchData(symbol);
    dataCache.set(symbol, historicalData);
  }

  // Munge the api data
  const { dates, closes } = mungeData(historicalData);
  console.log('dates and closes', dates, closes);

  // Calculate the strategy data
  const strategyData = runBacktester(
    dates,
    closes,
    lookback,
    volatility,
    leverage,
    shorting
  );
  console.log('strategy data', strategyData);
  // Display the strategy data
  displayResults(symbol, strategyData);
};

const linkClickListener = () => {
  $('a[href*="#"]').on('click', function (e) {
    e.preventDefault();
    $('html, body').animate(
      {
        scrollTop: $($(this).attr('href')).offset().top,
      },
      500,
      'linear'
    );
  });
};

// listen for form submissions and link clicks on page load
$(
  (() => {
    $customStrategyButton.one('click', handleFormSubmit);
    $starterStrategyButton.one('click', handleFormSubmit);
    linkClickListener();
  })()
);
