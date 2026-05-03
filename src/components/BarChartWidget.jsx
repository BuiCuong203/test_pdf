import React from 'react';
import ReactECharts from 'echarts-for-react';

const BarChartWidget = () => {
  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' }
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
        name: 'Video Ads',
        type: 'bar',
        barWidth: '85%',
        data: [40, 160, 110, 60, 220, 130, 185],
        itemStyle: {
          color: '#2ab7ff'
        }
      }
    ]
  };

  return (
    <div className="widget span-8">
      <h3 className="widget-title">Phân tích số lượng hợp đồng của các phòng ban trong năm 2024.</h3>
      <div className="chart-container">
        <ReactECharts option={option} style={{ height: '100%', width: '100%' }} />
      </div>
    </div>
  );
};

export default BarChartWidget;
