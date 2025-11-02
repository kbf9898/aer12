import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, CheckCircle, XCircle, Clock, Users, TrendingUp,
  Mail, MessageSquare, Smartphone, Bell, Download, RefreshCw,
  AlertCircle, Send, Pause, Play, BarChart3, Eye, Loader2
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { CampaignService, Campaign, CampaignMetrics } from '../services/campaignService';
import { supabase } from '../lib/supabase';

interface CampaignSend {
  id: string;
  customer_id: string;
  channel: string;
  status: 'pending' | 'delivered' | 'failed' | 'bounced';
  sent_at: string;
  delivered_at?: string;
  error_message?: string;
  customer?: {
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
  };
}

const CampaignMonitoring: React.FC = () => {
  const { campaignId } = useParams<{ campaignId: string }>();
  const navigate = useNavigate();
  const { restaurant } = useAuth();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [metrics, setMetrics] = useState<CampaignMetrics | null>(null);
  const [sends, setSends] = useState<CampaignSend[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    if (restaurant && campaignId) {
      loadCampaignData();
    }
  }, [restaurant, campaignId]);

  const loadCampaignData = async () => {
    if (!restaurant || !campaignId) return;

    try {
      setLoading(true);
      const [campaignData, metricsData, sendsData] = await Promise.all([
        CampaignService.getCampaign(restaurant.id, campaignId),
        CampaignService.getCampaignMetrics(campaignId),
        loadCampaignSends(),
      ]);

      setCampaign(campaignData);
      setMetrics(metricsData);
      setSends(sendsData);
    } catch (error: any) {
      console.error('Error loading campaign data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCampaignSends = async () => {
    if (!campaignId) return [];

    try {
      const { data, error } = await supabase
        .from('campaign_sends')
        .select(`
          *,
          customer:customers(first_name, last_name, email, phone)
        `)
        .eq('campaign_id', campaignId)
        .order('sent_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error loading campaign sends:', error);
      return [];
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadCampaignData();
    setRefreshing(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'bounced':
        return 'bg-orange-100 text-orange-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered':
        return CheckCircle;
      case 'failed':
      case 'bounced':
        return XCircle;
      case 'pending':
        return Clock;
      default:
        return AlertCircle;
    }
  };

  const filteredSends = sends.filter((send) => {
    if (filterStatus === 'all') return true;
    return send.status === filterStatus;
  });

  const deliveryRate = metrics?.total_sent
    ? ((metrics.total_delivered / metrics.total_sent) * 100).toFixed(1)
    : '0.0';

  const openRate = metrics?.total_delivered
    ? ((metrics.total_opened / metrics.total_delivered) * 100).toFixed(1)
    : '0.0';

  const clickRate = metrics?.total_opened
    ? ((metrics.total_clicked / metrics.total_opened) * 100).toFixed(1)
    : '0.0';

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-gray-200 rounded w-48"></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-6 border border-gray-200">
              <div className="h-6 bg-gray-200 rounded mb-4"></div>
              <div className="h-8 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Campaign Not Found</h3>
        <button
          onClick={() => navigate('/dashboard/campaigns')}
          className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
        >
          Back to Campaigns
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard/campaigns')}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{campaign.name}</h1>
            <p className="text-gray-600 mt-1">Campaign Performance Monitoring</p>
          </div>
        </div>

        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-6 border border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Targeted</p>
              <p className="text-2xl font-bold text-gray-900">{metrics?.total_targeted || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Delivered</p>
              <p className="text-2xl font-bold text-gray-900">{metrics?.total_delivered || 0}</p>
              <p className="text-xs text-gray-500">{deliveryRate}% delivery rate</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <Eye className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Opened</p>
              <p className="text-2xl font-bold text-gray-900">{metrics?.total_opened || 0}</p>
              <p className="text-xs text-gray-500">{openRate}% open rate</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Clicked</p>
              <p className="text-2xl font-bold text-gray-900">{metrics?.total_clicked || 0}</p>
              <p className="text-xs text-gray-500">{clickRate}% click rate</p>
            </div>
          </div>
        </div>
      </div>

      {metrics && metrics.total_failed > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-900">
                {metrics.total_failed} messages failed to deliver
              </p>
              <p className="text-sm text-red-700 mt-1">
                Review the delivery log below to see which customers were affected
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Delivery Log</h2>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#E6A85C] focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="delivered">Delivered</option>
            <option value="failed">Failed</option>
            <option value="bounced">Bounced</option>
            <option value="pending">Pending</option>
          </select>
        </div>

        {filteredSends.length === 0 ? (
          <div className="text-center py-12">
            <Send className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Sends Found</h3>
            <p className="text-gray-500">
              {sends.length === 0
                ? 'This campaign has not been sent yet.'
                : 'No sends match the selected filter.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-gray-200">
                <tr>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Customer</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Contact</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Sent At</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredSends.map((send) => {
                  const StatusIcon = getStatusIcon(send.status);

                  return (
                    <tr key={send.id} className="hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium text-gray-900">
                            {send.customer?.first_name} {send.customer?.last_name}
                          </p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-sm text-gray-600">
                          {send.channel === 'email' && send.customer?.email}
                          {(send.channel === 'whatsapp' || send.channel === 'sms') &&
                            send.customer?.phone}
                        </p>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                            send.status
                          )}`}
                        >
                          <StatusIcon className="h-3 w-3" />
                          {send.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-sm text-gray-600">
                          {new Date(send.sent_at).toLocaleDateString()}{' '}
                          {new Date(send.sent_at).toLocaleTimeString()}
                        </p>
                      </td>
                      <td className="py-3 px-4">
                        {send.error_message && (
                          <p className="text-xs text-red-600">{send.error_message}</p>
                        )}
                        {send.delivered_at && (
                          <p className="text-xs text-green-600">
                            Delivered {new Date(send.delivered_at).toLocaleTimeString()}
                          </p>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default CampaignMonitoring;
