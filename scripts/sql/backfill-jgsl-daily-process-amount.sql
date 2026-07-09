-- 回填 JG散料 / JGSL 的 dailyProcess_amount、dailyProcess_price
-- 口径：投料成本合计 Σ(毛料吨数 × 毛料单价)；单价 = 金额 / 产量
-- 生成时间：按库内实际投料列重算

UPDATE ProcessingCostInput SET dailyProcess_amount = 92995.8273, dailyProcess_price = 2141.7740 WHERE id = 1520;
UPDATE ProcessingCostInput SET dailyProcess_amount = 244031.2937, dailyProcess_price = 2067.0108 WHERE id = 1524;
UPDATE ProcessingCostInput SET dailyProcess_amount = 123138.4010, dailyProcess_price = 1755.3585 WHERE id = 1543;
UPDATE ProcessingCostInput SET dailyProcess_amount = 17788.4289, dailyProcess_price = 1976.4921 WHERE id = 1544;
UPDATE ProcessingCostInput SET dailyProcess_amount = 152091.0759, dailyProcess_price = 1873.5043 WHERE id = 1545;
UPDATE ProcessingCostInput SET dailyProcess_amount = 79811.5617, dailyProcess_price = 2007.8380 WHERE id = 1583;
UPDATE ProcessingCostInput SET dailyProcess_amount = 77310.4930, dailyProcess_price = 1901.3894 WHERE id = 1584;
UPDATE ProcessingCostInput SET dailyProcess_amount = 79915.1437, dailyProcess_price = 1962.0708 WHERE id = 1587;
