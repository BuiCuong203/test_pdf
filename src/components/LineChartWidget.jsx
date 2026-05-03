import React from 'react';
import ReactECharts from 'echarts-for-react';

const LineChartWidget = () => {
  const option = {
    tooltip: {
      trigger: 'axis'
    },
    legend: {
      data: ['Video Ads'],
      left: 'left',
      textStyle: { color: '#9aa0a6' },
      icon: 'rect',
      itemWidth: 10,
      itemHeight: 10
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '15%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: ['1', '2', '3', '4', '5', '6', '7', '8'],
      axisLine: { lineStyle: { color: '#383a42' } },
      axisLabel: { show: false },
      axisTick: { show: false }
    },
    yAxis: {
      type: 'value',
      splitLine: {
        lineStyle: { color: '#383a42', type: 'dashed' }
      },
      axisLabel: { color: '#9aa0a6' }
    },
    series: [
      {
        name: 'Video Ads',
        type: 'line',
        data: [10, 40, 20, 80, 25, 95, 120, 160],
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: {
          color: '#2ab7ff',
          width: 2
        },
        itemStyle: {
          color: '#2ab7ff',
          borderColor: '#2ab7ff',
          borderWidth: 2
        }
      }
    ]
  };

  return (
    <div className="widget span-4">
      <h3 className="widget-title">Số lượng hợp đồng theo phòng ban năm 20...</h3>
      <div className="chart-container">
        <ReactECharts option={option} style={{ height: '100%', width: '100%' }} />
      </div>
    </div>
  );
};

export default LineChartWidget;
