import React from 'react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';

const AreaChartWidget = () => {
  const option = {
    tooltip: {
      trigger: 'axis'
    },
    legend: {
      data: ['Search Engine'],
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
      boundaryGap: false,
      data: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      axisLine: { lineStyle: { color: '#383a42' } },
      axisLabel: { color: '#9aa0a6' },
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
        name: 'Search Engine',
        type: 'line',
        smooth: false,
        symbol: 'none',
        lineStyle: {
          color: '#2ab7ff',
          width: 2
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(42, 183, 255, 0.3)' },
            { offset: 1, color: 'rgba(42, 183, 255, 0.05)' }
          ])
        },
        data: [150, 175, 168, 172, 240, 248, 245]
      }
    ]
  };

  return (
    <div className="widget span-4">
      <h3 className="widget-title">Thống kê hợp đồng theo từng phòng ban tr...</h3>
      <div className="chart-container">
        <ReactECharts option={option} style={{ height: '100%', width: '100%' }} />
      </div>
    </div>
  );
};

export default AreaChartWidget;
