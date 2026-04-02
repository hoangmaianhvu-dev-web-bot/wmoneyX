import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface PaymentQRProps {
  userPhone: string;
  withdrawAmount: number;
  orderId: string;
}

const PaymentQR: React.FC<PaymentQRProps> = ({ userPhone, withdrawAmount, orderId }) => {
  // --- ĐOẠN CODE GỐC THEO YÊU CẦU (GIỮ NGUYÊN CẤU TRÚC) ---
  
  // SĐT người nhận tiền (Admin hoặc Người dùng rút tiền)
  const sdt = userPhone; 
  
  // Số tiền cần chuyển (Phải là số nguyên, không chứa ký tự đặc biệt)
  const soTien = withdrawAmount; 
  
  // Nội dung chuyển tiền (Dùng để đối soát mã đơn hàng tự động)
  const noiDung = orderId; 

  // Cấu trúc Link MoMo: receiver (SĐT), amount (Số tiền), memo (Lời nhắn đã mã hóa)
  const linkMomo = `https://nhantien.momo.vn/v1/transfer?receiver=${sdt}&amount=${soTien}&memo=${encodeURIComponent(noiDung)}`;

  // Cấu trúc Link ZaloPay: receiver (SĐT), amount (Số tiền), note (Lời nhắn đã mã hóa)
  const linkZalo = `https://social.zalopay.vn/mt-app/v1/transfer?receiver=${sdt}&amount=${soTien}&note=${encodeURIComponent(noiDung)}`;
  
  // --- KẾT THÚC ĐOẠN CODE GỐC ---

  // Giao diện khung hiển thị mã QR (CSS-in-JS)
  const cardStyle: React.CSSProperties = {
    display: 'inline-block',
    margin: '15px',
    padding: '15px',
    border: '1px solid #eee',
    borderRadius: '10px',
    textAlign: 'center',
    background: '#fff',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  };

  return (
    <div style={{ textAlign: 'center', padding: '20px' }}>
      <h2 className="text-xl font-bold mb-4">MÃ QR RÚT TIỀN</h2>

      <div className="flex flex-wrap justify-center gap-4">
        {/* HIỂN THỊ QR MOMO - Màu thương hiệu hồng đặc trưng */}
        <div style={cardStyle}>
          <h3 style={{ color: '#ae2070', fontWeight: 'bold', marginBottom: '10px' }}>MoMo</h3>
          {/* level="H": Mức độ sửa lỗi cao giúp mã QR cực nhạy khi quét bằng camera */}
          <QRCodeSVG value={linkMomo} size={200} level="H" includeMargin={true} />
          <div style={{ marginTop: '10px' }}>
            <p className="text-sm">SĐT: <b>{sdt}</b></p>
            <p className="text-sm">Số tiền: <b>{Number(soTien).toLocaleString()}đ</b></p>
          </div>
        </div>

        {/* HIỂN THỊ QR ZALOPAY - Màu thương hiệu xanh đặc trưng */}
        <div style={cardStyle}>
          <h3 style={{ color: '#008fe5', fontWeight: 'bold', marginBottom: '10px' }}>ZaloPay</h3>
          <QRCodeSVG value={linkZalo} size={200} level="H" includeMargin={true} />
          <div style={{ marginTop: '10px' }}>
            <p className="text-sm">SĐT: <b>{sdt}</b></p>
            <p className="text-sm">Số tiền: <b>{Number(soTien).toLocaleString()}đ</b></p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentQR;
