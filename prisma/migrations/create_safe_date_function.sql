-- ============================================
-- 创建安全的日期解析函数
-- ============================================
-- 这个函数会安全地解析日期，避免在严格模式下抛出错误

DELIMITER $$

DROP FUNCTION IF EXISTS `fn_safe_parse_date`;

CREATE FUNCTION `fn_safe_parse_date`(p_date_str VARCHAR(50))
RETURNS DATE
READS SQL DATA
DETERMINISTIC
BEGIN
    DECLARE v_parsed_date DATE DEFAULT NULL;
    
    -- 尝试 MM/DD/YYYY 格式
    BEGIN
        DECLARE CONTINUE HANDLER FOR SQLEXCEPTION BEGIN END;
        SET v_parsed_date = STR_TO_DATE(p_date_str, '%m/%d/%Y');
    END;
    
    IF v_parsed_date IS NOT NULL THEN
        RETURN v_parsed_date;
    END IF;
    
    -- 尝试 YYYY-MM-DD 格式
    BEGIN
        DECLARE CONTINUE HANDLER FOR SQLEXCEPTION BEGIN END;
        SET v_parsed_date = STR_TO_DATE(p_date_str, '%Y-%m-%d');
    END;
    
    IF v_parsed_date IS NOT NULL THEN
        RETURN v_parsed_date;
    END IF;
    
    -- 尝试 DD/MM/YYYY 格式
    BEGIN
        DECLARE CONTINUE HANDLER FOR SQLEXCEPTION BEGIN END;
        SET v_parsed_date = STR_TO_DATE(p_date_str, '%d/%m/%Y');
    END;
    
    IF v_parsed_date IS NOT NULL THEN
        RETURN v_parsed_date;
    END IF;
    
    -- 尝试 YYYY/MM/DD 格式
    BEGIN
        DECLARE CONTINUE HANDLER FOR SQLEXCEPTION BEGIN END;
        SET v_parsed_date = STR_TO_DATE(p_date_str, '%Y/%m/%d');
    END;
    
    IF v_parsed_date IS NOT NULL THEN
        RETURN v_parsed_date;
    END IF;
    
    -- 如果所有格式都失败，返回默认值
    RETURN CAST('1900-01-01' AS DATE);
END$$

DELIMITER ;

-- 测试函数
SELECT 
    fn_safe_parse_date('07/01/2025') as parsed_mmddyyyy,
    fn_safe_parse_date('2025-07-01') as parsed_yyyymmdd,
    fn_safe_parse_date('1/17/2026') as parsed_test;
