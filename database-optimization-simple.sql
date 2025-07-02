-- 数据库优化方案：增加专用缩略图字段
-- 简化版本 - 避免复杂的动态SQL，提高兼容性

-- 为 receiptfg 表添加缩略图字段
ALTER TABLE receiptfg 
ADD COLUMN tinyThumbnail LONGTEXT COMMENT '2%极小缩略图Base64';

ALTER TABLE receiptfg 
ADD COLUMN smallThumbnail VARCHAR(500) COMMENT '5%小缩略图URL';

ALTER TABLE receiptfg 
ADD COLUMN mediumThumbnail VARCHAR(500) COMMENT '15%中等缩略图URL';

ALTER TABLE receiptfg 
ADD COLUMN thumbnailProcessed TINYINT(1) DEFAULT 0 COMMENT '缩略图是否已处理';

-- 为 receiptfc 表添加缩略图字段
ALTER TABLE receiptfc 
ADD COLUMN tinyThumbnail LONGTEXT COMMENT '2%极小缩略图Base64';

ALTER TABLE receiptfc 
ADD COLUMN smallThumbnail VARCHAR(500) COMMENT '5%小缩略图URL';

ALTER TABLE receiptfc 
ADD COLUMN mediumThumbnail VARCHAR(500) COMMENT '15%中等缩略图URL';

ALTER TABLE receiptfc 
ADD COLUMN thumbnailProcessed TINYINT(1) DEFAULT 0 COMMENT '缩略图是否已处理';

-- 创建缩略图处理任务表
CREATE TABLE thumbnail_tasks (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    table_name VARCHAR(50) NOT NULL COMMENT '表名',
    record_id BIGINT NOT NULL COMMENT '记录ID',
    original_urls JSON NOT NULL COMMENT '原始图片URL数组',
    status ENUM('pending', 'processing', 'completed', 'failed') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP NULL,
    error_message TEXT NULL,
    INDEX idx_status_created (status, created_at),
    INDEX idx_table_record (table_name, record_id)
) COMMENT='缩略图生成任务队列';

-- 创建索引
CREATE INDEX idx_receiptfg_thumbnail_processed ON receiptfg(thumbnailProcessed);
CREATE INDEX idx_receiptfg_ordertime_thumbnail ON receiptfg(orderTime, thumbnailProcessed);
CREATE INDEX idx_receiptfc_thumbnail_processed ON receiptfc(thumbnailProcessed);
CREATE INDEX idx_receiptfc_ordertime_thumbnail ON receiptfc(orderTime, thumbnailProcessed); 