function runBacktester(
  dates,
  closes,
  lookback,
  targetVolatility,
  maxLeverage,
  allowShorts
) {
  //
  const returns = calcReturns(closes);
  //console.log('returns', returns);
  //
  const totalReturns = calcTotalReturns(returns, lookback);
  //console.log('totalReturns', totalReturns);
  //
  const volatilities = calcVolatilities(returns, lookback);
  //console.log('volatilities', volatilities);
  //
  const volatilityScalars = calcVolatilityScalars(
    volatilities,
    targetVolatility
  );
  //console.log('volatilityScalars', volatilityScalars);
  //
  const volatilityScaledReturns = calcVolatilityScaledReturns(
    returns,
    volatilityScalars,
    lookback
  );
  //console.log('volatilityScaledReturns', volatilityScaledReturns);
  //
  const volatilityScaledTotalReturns = calcVolatilityScaledTotalReturns(
    volatilityScaledReturns
  );
  //console.log('volatilityScaledTotalReturns', volatilityScaledTotalReturns);
  //
  const ranges = calcRanges(volatilityScaledTotalReturns, lookback);
  //console.log('ranges', ranges);
  //
  const rangeScalars = calcRangeScalars(
    volatilityScaledTotalReturns,
    ranges,
    allowShorts,
    maxLeverage
  );
  //console.log('rangeScalars', rangeScalars);
  //
  const rangeScaledReturns = calcRangeScaledReturns(
    volatilityScaledReturns,
    rangeScalars
  );
  //console.log('rangeScaledReturns', rangeScaledReturns);
  //
  const rangeScaledTotalReturns = calcRangeScaledTotalReturns(
    rangeScaledReturns
  );
  //console.log('rangeScaledTotalReturns', rangeScaledTotalReturns);
  //
  const position =
    volatilityScalars[volatilityScalars.length - 1] *
    rangeScalars[rangeScalars.length - 1];

  dates = dates.slice(lookback - 1, dates.length + 1);
  //
  return {
    dates,
    totalReturns,
    rangeScaledTotalReturns,
    position,
    closes,
  };
}

// Calculates Average
function average(data) {
  return data.reduce((sum, value) => sum + value) / data.length;
}

// Calculates Standard Deviation
function standardDeviation(values) {
  return Math.sqrt(
    average(values.map((value) => (value - average(values)) ** 2))
  );
}

// Calculate the raw crypto return series
function calcReturns(closes) {
  const returns = [];
  //starts at second day
  for (let i = 1; i < closes.length; i++) {
    // percent return on day[i]
    returns.push(closes[i] / closes[i - 1] - 1);
  }
  return returns;
}

// Calculate the Value Added Daily Index (Total Return) from the new return series
function calcTotalReturns(returns, lookback) {
  const totalReturns = [1];
  for (let i = lookback - 1; i < returns.length; i++) {
    const len = totalReturns.length;
    totalReturns.push(
      totalReturns[len - 1] + returns[i] * totalReturns[len - 1]
    );
  }
  return totalReturns;
}

//
function calcVolatilities(returns, lookback) {
  const vols = [];
  for (let i = lookback - 1; i < returns.length; i++) {
    let begWindow = i - lookback;
    if (begWindow < 0) {
      begWindow = 0;
    }
    let window = returns.slice(begWindow, i + 1);
    vols.push(standardDeviation(window) * Math.sqrt(260));
  }
  return vols;
}

//
function calcVolatilityScalars(volatilities, targetVolatility) {
  const volScalars = [];
  for (let i = 0; i < volatilities.length; i++) {
    let volScalar = targetVolatility / volatilities[i];
    if (volScalar > 1) {
      volScalars.push(1);
    } else {
      volScalars.push(volScalar);
    }
  }
  return volScalars.map((e) => Math.round(e * 100) / 100);
}

//
function calcVolatilityScaledReturns(returns, volatilityScalars, lookback) {
  const scalarReturns = [];
  for (let i = 1; i < volatilityScalars.length; i++) {
    scalarReturns.push(returns[lookback + i - 1] * volatilityScalars[i - 1]);
  }
  return scalarReturns;
}

//
function calcVolatilityScaledTotalReturns(returns) {
  const totalReturns = [1];
  for (let i = 0; i < returns.length; i++) {
    const len = totalReturns.length;
    totalReturns.push(
      totalReturns[len - 1] + returns[i] * totalReturns[len - 1]
    );
  }
  return totalReturns;
}

//
function calcRanges(volatilityScaledTotalReturns, lookback) {
  const ranges = [];
  for (let i = 1; i < volatilityScaledTotalReturns.length; i++) {
    let begWindow = i - lookback;
    if (begWindow < 0) {
      begWindow = 0;
    }
    let window = volatilityScaledTotalReturns.slice(begWindow, i + 1);

    ranges.push(Math.max(...window) - Math.min(...window));

    /*if(isNaN(Math.max(...window))) {
      window = volatilityScaledTotalReturns.slice(i-lookback+1,i+1);
      ranges.push(Math.max(...window)-Math.min(...window)); 
    }
    else {

    }*/
  }
  return ranges;
}

//
function calcRangeScalars(
  volatilityScaledTotalReturns,
  ranges,
  allowShorts,
  maxLeverage
) {
  const rangeScalars = [];

  for (let i = 1; i < volatilityScaledTotalReturns.length; i++) {
    const curPos = volatilityScaledTotalReturns[i];
    let begWindow = i - lookback;
    if (begWindow < 0) {
      begWindow = 0;
    }
    let window = volatilityScaledTotalReturns.slice(begWindow, i + 1);

    let min = Math.min(...window);
    let trendScore = (curPos - min) / ranges[i - 1];
    if (allowShorts) {
      trendScore = (trendScore - 0.5) * 2 * maxLeverage;
    } else {
      trendScore = trendScore * maxLeverage;
    }
    rangeScalars.push(trendScore);
  }
  return rangeScalars.map((e) => Math.round(e * 100) / 100);
}

//
function calcRangeScaledReturns(volatilityScaledReturns, rangeScalars) {
  const scalarReturns = [];
  for (let i = 1; i < rangeScalars.length; i++) {
    scalarReturns.push(rangeScalars[i - 1] * volatilityScaledReturns[i]);
  }
  return scalarReturns;
}

//
function calcRangeScaledTotalReturns(returns) {
  const totalReturns = [1];
  for (let i = 0; i < returns.length; i++) {
    const len = totalReturns.length;
    totalReturns.push(
      totalReturns[len - 1] + returns[i] * totalReturns[len - 1]
    );
  }
  return totalReturns;
}

export { runBacktester };
