import React from 'react';
import ReactECharts from 'echarts-for-react';

const PieChartWidget = () => {
  const option = {
    tooltip: {
      trigger: 'item'
    },
    legend: {
      orient: 'vertical',
      right: '5%',
      top: 'center',
      textStyle: { color: '#9aa0a6' },
      icon: 'rect',
      itemWidth: 10,
      itemHeight: 10,
      data: ['Video Ads', 'Search Engine', 'Direct', 'Email']
    },
    series: [
      {
        name: 'Giao dịch',
        type: 'pie',
        radius: ['0%', '70%'],
        center: ['30%', '50%'],
        data: [
          { value: 1048, name: 'Video Ads', itemStyle: { color: '#2ab7ff' } },
          { value: 735, name: 'Search Engine', itemStyle: { color: '#ff9800' } },
          { value: 580, name: 'Direct', itemStyle: { color: '#ab47bc' } },
          { value: 484, name: 'Email', itemStyle: { color: '#4caf50' } },
          { value: 300, name: 'Other', itemStyle: { color: '#e91e63' } }
        ],
        label: {
          show: false
        },
        labelLine: {
          show: false
        }
      }
    ]
  };

  return (
    <div className="widget span-4">
      <h3 className="widget-title">Biểu đồ thể hiện số lượng giao dịch theo từ...</h3>
      <div className="chart-container">
        <ReactECharts option={option} style={{ height: '100%', width: '100%' }} />
      </div>
    </div>
  );
};

export default PieChartWidget;
