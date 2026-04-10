'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface WasteFormData {
  wasteCode: string;
  wasteName: string;
  wasteCategory: string;
  wasteType: string;
  quantity: string;
  unit: string;
  source: string;
  flowDirection: string;
  storageLocation: string;
  storageMethod: string;
  utilizationMethod: string;
  disposalMethod: string;
  disposalUnit: string;
  disposalLocation: string;
  recordDate: string;
  operator: string;
  remark: string;
}

export default function WasteInput() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [formData, setFormData] = useState<WasteFormData>({
    wasteCode: '',
    wasteName: '',
    wasteCategory: '',
    wasteType: '',
    quantity: '',
    unit: '吨',
    source: '',
    flowDirection: '',
    storageLocation: '',
    storageMethod: '',
    utilizationMethod: '',
    disposalMethod: '',
    disposalUnit: '',
    disposalLocation: '',
    recordDate: new Date().toISOString().split('T')[0],
    operator: '',
    remark: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/waste-management', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        setMessage({ type: 'success', text: '固废信息录入成功！' });
        // 清空表单
        setFormData({
          wasteCode: '',
          wasteName: '',
          wasteCategory: '',
          wasteType: '',
          quantity: '',
          unit: '吨',
          source: '',
          flowDirection: '',
          storageLocation: '',
          storageMethod: '',
          utilizationMethod: '',
          disposalMethod: '',
          disposalUnit: '',
          disposalLocation: '',
          recordDate: new Date().toISOString().split('T')[0],
          operator: '',
          remark: ''
        });
        // 3秒后跳转到总览页面
        setTimeout(() => {
          router.push('/waste-management');
        }, 2000);
      } else {
        setMessage({ type: 'error', text: result.error || '录入失败，请重试' });
      }
    } catch (error) {
      console.error('录入失败:', error);
      setMessage({ type: 'error', text: '网络错误，请检查连接后重试' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-4xl mx-auto">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            工业固体废物信息录入
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            请填写完整的固废信息，确保数据详实准确、可追溯
          </p>
        </div>

        {/* 消息提示 */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              message.type === 'success'
                ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-400'
                : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-400'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* 表单 */}
        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-6">
          {/* 基本信息 */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">基本信息</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  固废代码 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="wasteCode"
                  value={formData.wasteCode}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="如：HW01"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  固废名称 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="wasteName"
                  value={formData.wasteName}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="如：废金属"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  固废类别 <span className="text-red-500">*</span>
                </label>
                <select
                  name="wasteCategory"
                  value={formData.wasteCategory}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">请选择</option>
                  <option value="危险废物">危险废物</option>
                  <option value="一般工业固废">一般工业固废</option>
                  <option value="其他">其他</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  固废种类 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="wasteType"
                  value={formData.wasteType}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="如：废金属、废塑料等"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  数量 <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    name="quantity"
                    value={formData.quantity}
                    onChange={handleChange}
                    required
                    step="0.001"
                    min="0"
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0.000"
                  />
                  <select
                    name="unit"
                    value={formData.unit}
                    onChange={handleChange}
                    className="w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="吨">吨</option>
                    <option value="立方米">立方米</option>
                    <option value="千克">千克</option>
                    <option value="升">升</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  产生来源 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="source"
                  value={formData.source}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="如：生产车间、包装工序等"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  记录日期 <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="recordDate"
                  value={formData.recordDate}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  操作员/安全员 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="operator"
                  value={formData.operator}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="请输入姓名"
                />
              </div>
            </div>
          </div>

          {/* 流向信息 */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">流向信息</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  流向（去向） <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="flowDirection"
                  value={formData.flowDirection}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="如：回收利用、委托处置等"
                />
              </div>
            </div>
          </div>

          {/* 贮存信息 */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">贮存信息</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  贮存地点
                </label>
                <input
                  type="text"
                  name="storageLocation"
                  value={formData.storageLocation}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="如：1号仓库、临时堆放区等"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  贮存方式
                </label>
                <input
                  type="text"
                  name="storageMethod"
                  value={formData.storageMethod}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="如：袋装、桶装、散装等"
                />
              </div>
            </div>
          </div>

          {/* 利用信息 */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">利用信息</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  利用方式
                </label>
                <input
                  type="text"
                  name="utilizationMethod"
                  value={formData.utilizationMethod}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="如：再生利用、资源化利用等"
                />
              </div>
            </div>
          </div>

          {/* 处置信息 */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">处置信息</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  处置方式
                </label>
                <input
                  type="text"
                  name="disposalMethod"
                  value={formData.disposalMethod}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="如：焚烧、填埋、其他等"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  处置单位
                </label>
                <input
                  type="text"
                  name="disposalUnit"
                  value={formData.disposalUnit}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="请输入处置单位名称"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  处置地点
                </label>
                <input
                  type="text"
                  name="disposalLocation"
                  value={formData.disposalLocation}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="请输入处置地点"
                />
              </div>
            </div>
          </div>

          {/* 备注 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              备注
            </label>
            <textarea
              name="remark"
              value={formData.remark}
              onChange={handleChange}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="其他需要说明的信息..."
            />
          </div>

          {/* 提交按钮 */}
          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-3 px-6 rounded-md transition-colors"
            >
              {loading ? '提交中...' : '提交录入'}
            </button>
            <button
              type="button"
              onClick={() => router.push('/waste-management')}
              className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              返回总览
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}





