// Categorical slots in fixed order (validated for CVD separation on the white card surface).
// Slots 3-4 sit below 3:1 contrast, so every chart ships a table view alongside it.
export const SERIES = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100'];

export const CHART_INK = {
  grid: '#e7e7e4',
  axis: '#898781',
  surface: '#ffffff',
};

export const axisProps = {
  tickLine: false,
  axisLine: false,
  fontSize: 11,
  stroke: CHART_INK.axis,
  tick: { fill: CHART_INK.axis },
};
