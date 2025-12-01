import React from 'react';
import { Activity, ChangeLogEntry, Company, CompanyStatus, Deal, DealStage } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts/lib/index.js';

interface DashboardProps {
  companies: Company[];
  deals: Deal[];
  activities: Activity[];
  changeLogs: ChangeLogEntry[];
}

export const Dashboard: React.FC<DashboardProps> = ({ companies, deals, activities, changeLogs }) => {
  const conversionRate = deals.length > 0
    ? Math.round((deals.filter(d => d.stage !== DealStage.LEAD).length / deals.length) * 100)
    : 0;

  const latencyValues = changeLogs
    .map(log => log.latencyMinutes)
    .filter((v): v is number => typeof v === 'number');
  const avgLatency = latencyValues.length > 0
    ? Math.round(latencyValues.reduce((acc, cur) => acc + cur, 0) / latencyValues.length)
    : 0;

  const auditCoverage = changeLogs.length > 0
    ? Math.round((changeLogs.filter(log => log.tracked !== false).length / changeLogs.length) * 100)
    : 0;

  const stageAggregates = Object.values(DealStage).map(stage => {
    const stageDeals = deals.filter(d => d.stage === stage);
    const amount = stageDeals.reduce((sum, d) => sum + d.amount, 0);
    return { stage, amount, count: stageDeals.length };
  });

  const pipelineData = [
    { name: '진행 중', value: deals.filter(d => ![DealStage.CONTRACT, DealStage.LOST].includes(d.stage)).length },
    { name: '계약 성사', value: deals.filter(d => d.stage === DealStage.CONTRACT).length },
    { name: '실패/종료', value: deals.filter(d => d.stage === DealStage.LOST).length },
  ];

  const statusCounts = Object.values(CompanyStatus).map(status => ({
    name: status,
    count: companies.filter(c => c.status === status).length
  }));

  const recentActivities = [...activities]
    .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
    .slice(0, 4);

  const recentChanges = [...changeLogs]
    .sort((a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime())
    .slice(0, 5);

  const PIE_COLORS = ['#6366f1', '#22c55e', '#ef4444'];

  return (
    <div className="p-6 overflow-y-auto h-full bg-slate-50">
      <h2 className="text-xl font-bold text-slate-800 mb-6 tracking-tight">영업 성과 오버뷰</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
          <div className="text-xs font-semibold text-slate-500 uppercase">전체 관리 고객사</div>
          <div className="text-3xl font-bold text-slate-900 mt-2">{companies.length}<span className="text-sm text-slate-400 font-normal ml-1">개사</span></div>
          <div className="text-xs text-slate-500 mt-2">리드 {statusCounts.find(s => s.name === CompanyStatus.LEAD)?.count ?? 0}건</div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
          <div className="text-xs font-semibold text-slate-500 uppercase">리드 전환율</div>
          <div className="text-3xl font-bold text-indigo-600 mt-2">{conversionRate}%</div>
          <div className="text-xs text-slate-500 mt-2">Deal Stage 기준 리드→진행</div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
          <div className="text-xs font-semibold text-slate-500 uppercase">업데이트 지연시간</div>
          <div className="text-3xl font-bold text-slate-900 mt-2">{avgLatency}분</div>
          <div className="text-xs text-slate-500 mt-2">필드 변경 반영 평균</div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
          <div className="text-xs font-semibold text-slate-500 uppercase">변경 감사 커버리지</div>
          <div className="text-3xl font-bold text-emerald-600 mt-2">{auditCoverage}%</div>
          <div className="text-xs text-slate-500 mt-2">추적 필드 비율</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[26rem]">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col">
          <h3 className="text-lg font-bold text-slate-800 mb-6">단계별 파이프라인 금액</h3>
          <div className="flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stageAggregates} margin={{ bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="stage" tick={{fontSize: 11, fill: '#64748b'}} interval={0} angle={-25} textAnchor="end" height={60} />
                <YAxis tickFormatter={(value) => `${Math.round(value / 100000000)}억`} tick={{fontSize: 12, fill: '#64748b'}} />
                <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    cursor={{fill: '#f8fafc'}}
                    formatter={(value: number) => [`${value.toLocaleString()} 원`, '금액']}
                />
                <Bar dataKey="amount" fill="#6366f1" radius={[4, 4, 0, 0]} name="금액" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col">
          <h3 className="text-lg font-bold text-slate-800 mb-6">파이프라인 구성 (Deal)</h3>
          <div className="flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pipelineData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={110}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {pipelineData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} strokeWidth={0} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Legend verticalAlign="bottom" height={36} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-bold text-slate-900">최근 활동</h3>
            <span className="text-xs text-slate-500">최신 {recentActivities.length}건</span>
          </div>
          <div className="space-y-3">
            {recentActivities.map(activity => (
              <div key={activity.id} className="flex justify-between items-center border border-slate-200 rounded-lg p-3">
                <div>
                  <div className="text-sm font-semibold text-slate-900">{activity.summary}</div>
                  <div className="text-xs text-slate-500">{new Date(activity.occurredAt).toLocaleString('ko-KR')} · {activity.actor}</div>
                </div>
                <span className="px-2 py-1 rounded-full text-[11px] bg-indigo-50 text-indigo-700">{activity.type}</span>
              </div>
            ))}
            {recentActivities.length === 0 && <div className="text-sm text-slate-500">최근 활동이 없습니다.</div>}
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-bold text-slate-900">최근 변경 이력</h3>
            <span className="text-xs text-slate-500">최신 {recentChanges.length}건</span>
          </div>
          <div className="space-y-3">
            {recentChanges.map(log => (
              <div key={log.id} className="border border-slate-200 rounded-lg p-3 bg-slate-50">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-slate-900">{log.fieldName}</span>
                  <span className="text-xs text-slate-500">{new Date(log.changedAt).toLocaleString('ko-KR')}</span>
                </div>
                <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600">{log.oldValue}</span>
                  <span className="text-slate-400">→</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700">{log.newValue}</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-3">
                  <span>{log.changedBy}</span>
                  <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600">{log.changeType}</span>
                  {log.tracked === false && <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700">미추적</span>}
                </div>
              </div>
            ))}
            {recentChanges.length === 0 && <div className="text-sm text-slate-500">변경 이력이 없습니다.</div>}
          </div>
        </div>
      </div>
    </div>
  );
};
