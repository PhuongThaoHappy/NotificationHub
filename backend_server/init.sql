-- Create database
CREATE DATABASE IF NOT EXISTS notifyhub_db;
USE notifyhub_db;

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  platform VARCHAR(50) NOT NULL,
  sender VARCHAR(255) NOT NULL,
  subject VARCHAR(500),
  message LONGTEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_read BOOLEAN DEFAULT FALSE,
  INDEX idx_platform (platform),
  INDEX idx_is_read (is_read),
  INDEX idx_created_at (created_at)
);

-- Insert sample data
INSERT INTO notifications (platform, sender, subject, message, is_read) VALUES
('teams', 'Nguyễn Văn A', 'AI Vision Meeting', 'Bạn được nhắc đến trong cuộc họp AI Vision.', 0),
('slack', 'Backend Team', 'API Deployment', 'API notification-service đã deploy thành công lên môi trường Staging.', 0),
('outlook', 'Phòng nhân sự', 'Interview Schedule', 'Lịch phỏng vấn tuần này đã được cập nhật. Vui lòng kiểm tra.', 1),
('teams', 'Trần Thị B', 'Project Update', 'Cập nhật tiến độ dự án phần mềm quản lý kho hàng', 0),
('slack', 'QA Team', 'Test Results', 'Kết quả test e2e đã có sẵn. Vui lòng review.', 1);
