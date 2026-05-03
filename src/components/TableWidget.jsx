import React from 'react';

const TableWidget = () => {
  const data = [
    { time: '1691050636', sourceIp: '59.127.228.113', destIp: '10.214.42.243', result: 'Thất bại' },
    { time: '1691050636', sourceIp: '59.127.228.113', destIp: '10.214.42.243', result: 'Thất bại' },
    { time: '1691050636', sourceIp: '59.127.228.113', destIp: '10.214.42.243', result: 'Thất bại' },
  ];

  return (
    <div className="widget span-4">
      <h3 className="widget-title">Hiệu suất làm việc</h3>
      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Thời gian</th>
              <th>IP Nguồn</th>
              <th>IP Đích</th>
              <th>Kết quả</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, index) => (
              <tr key={index}>
                <td>{row.time}</td>
                <td>{row.sourceIp}</td>
                <td>{row.destIp}</td>
                <td>{row.result}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TableWidget;
