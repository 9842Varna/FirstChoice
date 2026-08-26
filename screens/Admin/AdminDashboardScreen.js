import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  Modal,
  FlatList,
  StatusBar,
} from 'react-native';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
import { LineChart, PieChart } from 'react-native-chart-kit';
import axios from 'axios';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');
const API_BASE = 'http://192.168.29.223:2927/api';
//const API_BASE = 'http://10.196.32.8:2927/api';


// Custom Horizontal Bar Chart Component
const HorizontalBarChart = ({ data, onBarPress }) => {
  const maxValue = Math.max(...data.map(item => item.count), 1);
  
  return (
    <View style={styles.horizontalChartContainer}>
      {data.map((item, index) => (
        <TouchableOpacity 
          key={index} 
          style={styles.horizontalBarRow}
          onPress={() => onBarPress(item.districtName)}
          activeOpacity={0.7}
        >
          <Text style={styles.horizontalBarLabel} numberOfLines={1}>
            {item.districtName}
          </Text>
          <View style={styles.horizontalBarWrapper}>
            <View 
              style={[
                styles.horizontalBar, 
                { width: `${(item.count / maxValue) * 70}%` }
              ]} 
            />
            <Text style={styles.horizontalBarValue}>{item.count}</Text>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
};

export default function AdminDashboardScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedReport, setSelectedReport] = useState('district');
  
  const [showModal, setShowModal] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalData, setModalData] = useState([]);
  const [modalLoading, setModalLoading] = useState(false);
  
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailData, setDetailData] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  
  const [dashboardData, setDashboardData] = useState({
    totalCustomers: 0,
    totalPlants: 0,
    totalServices: 0,
    totalRevenue: 0,
    openServices: 0,
    assignedServices: 0,
    completedToday: 0,
    completedOverall: 0,
    districtWiseServices: [],
    monthlyRevenue: [],
    serviceStatus: { completed: 0, assigned: 0, open: 0 },
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      const [statsRes, tasksRes, districtRes, revenueRes, statusRes] = await Promise.all([
        axios.get(`${API_BASE}/admin/dashboard/stats`),
        axios.get(`${API_BASE}/admin/dashboard/pending-tasks`),
        axios.get(`${API_BASE}/admin/dashboard/district-wise-services`),
        axios.get(`${API_BASE}/admin/dashboard/monthly-revenue`),
        axios.get(`${API_BASE}/admin/dashboard/service-status`),
      ]);

      setDashboardData({
        totalCustomers: statsRes.data.total_customers || 0,
        totalPlants: statsRes.data.total_plants || 0,
        totalServices: statsRes.data.total_services || 0,
        totalRevenue: statsRes.data.total_revenue || 0,
        openServices: tasksRes.data.openServices || 0,
        assignedServices: tasksRes.data.assignedServices || 0,
        completedToday: tasksRes.data.completedToday || 0,
        completedOverall: statusRes.data?.completed || 0,
        districtWiseServices: districtRes.data.districtWiseServices || districtRes.data.districts || [],
        monthlyRevenue: revenueRes.data.months || revenueRes.data || [],
        serviceStatus: statusRes.data || { completed: 0, assigned: 0, open: 0 },
      });
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const formatDateOnly = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    const day = date.getDate().toString().padStart(2, '0');
    const month = date.toLocaleString('en-US', { month: 'short' });
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  };

  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return '₹0';
    let num = parseFloat(amount);
    if (isNaN(num)) return '₹0';
    let str = Math.round(num).toString();
    let lastThree = str.slice(-3);
    let otherNumbers = str.slice(0, -3);
    if (otherNumbers !== '') {
      lastThree = ',' + lastThree;
    }
    let result = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + lastThree;
    return `₹${result}`;
  };

  const handleDistrictClick = async (districtName) => {
    setModalTitle(`${districtName} - Services`);
    setModalLoading(true);
    setShowModal(true);
    try {
      const res = await axios.get(`${API_BASE}/admin/services/by-district/${encodeURIComponent(districtName)}`);
      setModalData(res.data.services || []);
    } catch (error) {
      setModalData([]);
    } finally {
      setModalLoading(false);
    }
  };

  const handleRevenueClick = async (month, year) => {
    setModalTitle(`${month} ${year} - Services`);
    setModalLoading(true);
    setShowModal(true);
    try {
      const res = await axios.get(`${API_BASE}/admin/services/by-month`, { 
        params: { year: year, month: month } 
      });
      setModalData(res.data.services || []);
    } catch (error) {
      setModalData([]);
    } finally {
      setModalLoading(false);
    }
  };

  const handleStatusClick = async (statusName) => {
    let statusCode = '';
    if (statusName === 'Open') statusCode = 'O';
    else if (statusName === 'Assigned') statusCode = 'A';
    else if (statusName === 'Completed') statusCode = 'C';
    
    setModalTitle(`${statusName} Services`);
    setModalLoading(true);
    setShowModal(true);
    try {
      const res = await axios.get(`${API_BASE}/admin/services/by-status-code/${statusCode}`);
      setModalData(res.data.services || []);
    } catch (error) {
      setModalData([]);
    } finally {
      setModalLoading(false);
    }
  };

  const handleServiceDetail = async (srid) => {
    setDetailLoading(true);
    setShowDetailModal(true);
    try {
      const res = await axios.get(`${API_BASE}/admin/services/${srid}`);
      setDetailData(res.data);
    } catch (error) {
      setDetailData(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const getSortedDistricts = () => {
    const districts = dashboardData.districtWiseServices || [];
    return [...districts].sort((a, b) => b.count - a.count);
  };

  const getRevenueData = () => {
    const r = dashboardData.monthlyRevenue || [];
    return {
      labels: r.map(x => {
        if (x.month) return x.month.substring(0, 3);
        if (x.monthKey) return x.monthKey.substring(5, 7);
        return '';
      }),
      datasets: [{ data: r.map(x => x.revenue || 0) }],
    };
  };

  // ✅ FIXED STATUS COLORS
  const statusData = [
    { name: 'Open', count: dashboardData.serviceStatus?.open || 0, color: '#10B981', code: 'O' },
    { name: 'Assigned', count: dashboardData.serviceStatus?.assigned || 0, color: '#F59E0B', code: 'A' },
    { name: 'Completed', count: dashboardData.serviceStatus?.completed || 0, color: '#EF4444', code: 'C' },
  ];

  const StatCard = ({ title, value, icon, color }) => (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: color + '10' }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <View style={styles.statInfo}>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statTitle}>{title}</Text>
      </View>
    </View>
  );

  // ✅ CORRECT STATUS COLOR FUNCTION
  const getStatusColor = (status) => {
    if (status === 'C') return '#EF4444';     // Completed - Red
    if (status === 'A') return '#F59E0B';     // Assigned - Orange
    if (status === 'O') return '#10B981';     // Open - Green
    return '#10B981';
  };

  const getStatusText = (status) => {
    if (status === 'C') return 'Completed';
    if (status === 'A') return 'Assigned';
    if (status === 'O') return 'Open';
    return 'Open';
  };

  // ✅ IMPROVED TABLE ROW with proper alignment
  const ServiceTableRow = ({ item, onPress }) => {
    // Get correct status for display
    const displayStatus = getStatusText(item.status);
    const statusColor = getStatusColor(item.status);
    
    return (
      <TouchableOpacity style={styles.modalTableRow} onPress={() => onPress(item.srid)} activeOpacity={0.7}>
        <View style={styles.cellId}>
          <Text style={styles.cellIdText}>SR-{item.srid}</Text>
        </View>
        <View style={styles.cellPlant}>
          <Text style={styles.cellPlantText} numberOfLines={1}>{item.plantName || item.customerName || '-'}</Text>
        </View>
        <View style={styles.cellStatus}>
          <Text style={[styles.cellStatusText, { color: statusColor }]}>
            {displayStatus}
          </Text>
        </View>
        <View style={styles.cellDate}>
          <Text style={styles.cellDateText}>{formatDateOnly(item.requestDate)}</Text>
        </View>
        <View style={styles.cellArrow}>
          <Feather name="chevron-right" size={16} color="#cbd5e1" />
        </View>
      </TouchableOpacity>
    );
  };

  // ✅ IMPROVED TABLE HEADER with proper alignment
  const ModalTableHeader = () => (
    <View style={styles.modalTableHeader}>
      <View style={styles.headerId}>
        <Text style={styles.headerText}>SR ID</Text>
      </View>
      <View style={styles.headerPlant}>
        <Text style={styles.headerText}>Plant</Text>
      </View>
      <View style={styles.headerStatus}>
        <Text style={styles.headerText}>Status</Text>
      </View>
      <View style={styles.headerDate}>
        <Text style={styles.headerText}>Request Date</Text>
      </View>
      <View style={styles.headerArrow} />
    </View>
  );

  // Parts Table Components
  const PartsTableHeader = () => (
    <View style={styles.partsTableHeader}>
      <Text style={[styles.partsHeaderText, styles.partsHeaderName]}>Part Name</Text>
      <Text style={[styles.partsHeaderText, styles.partsHeaderQty]}>Qty</Text>
      <Text style={[styles.partsHeaderText, styles.partsHeaderRate]}>Rate</Text>
      <Text style={[styles.partsHeaderText, styles.partsHeaderTotal]}>Total</Text>
    </View>
  );

  const PartsTableRow = ({ part, index }) => {
    const total = (part.quantity || 0) * (part.rate || 0);
    return (
      <View style={[styles.partsTableRow, index % 2 === 0 ? styles.partsEvenRow : styles.partsOddRow]}>
        <Text style={[styles.partsCell, styles.partsCellName]} numberOfLines={1}>{part.partName}</Text>
        <Text style={[styles.partsCell, styles.partsCellQty]}>{part.quantity}</Text>
        <Text style={[styles.partsCell, styles.partsCellRate]}>{formatCurrency(part.rate)}</Text>
        <Text style={[styles.partsCell, styles.partsCellTotal]}>{formatCurrency(total)}</Text>
      </View>
    );
  };

  // Service Detail Modal
  const ServiceDetailModal = ({ visible, data, loading, onClose }) => {
    return (
      <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
        <View style={styles.detailOverlay}>
          <View style={styles.detailModal}>
            <View style={styles.detailHeader}>
              <Text style={styles.detailTitle}>Service Details</Text>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {loading ? (
                <View style={styles.modalCenter}>
                  <ActivityIndicator size="large" color="#3b82f6" />
                  <Text style={styles.modalCenterText}>Loading...</Text>
                </View>
              ) : data ? (
                <View style={styles.detailBody}>
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Basic Information</Text>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Service ID</Text>
                      <Text style={styles.detailValue}>SR-{data.srid}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Plant</Text>
                      <Text style={styles.detailValue}>{data.plantName || '-'}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>District</Text>
                      <Text style={styles.detailValue}>{data.districtName || '-'}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Request Date</Text>
                      <Text style={styles.detailValue}>{formatDateOnly(data.requestDate)}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Status</Text>
                      <Text style={[styles.detailValue, { color: getStatusColor(data.status), fontWeight: '600' }]}>
                        {getStatusText(data.status)}
                      </Text>
                    </View>
                    {data.problem && data.problem !== '-' && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Problem</Text>
                        <Text style={styles.detailValue}>{data.problem}</Text>
                      </View>
                    )}
                  </View>

                  <Text style={styles.detailSectionTitle}>Equipment Details</Text>
                  {data.equipments && data.equipments.length > 0 ? (
                    data.equipments.map((eq, idx) => {
                      const serviceRateAmount = eq.serviceRate || 0;
                      const partsTotal = eq.parts?.reduce((sum, p) => sum + ((p.quantity || 0) * (p.rate || 0)), 0) || 0;
                      const equipmentTotal = serviceRateAmount + partsTotal;
                      
                      return (
                        <View key={idx} style={styles.detailEquipmentCard}>
                          <View style={styles.detailEquipmentHeader}>
                            <Text style={styles.detailEquipmentName}>{eq.equipmentName || '-'}</Text>
                            <Text style={[styles.detailEquipmentStatus, { color: getStatusColor(eq.status) }]}>
                              {getStatusText(eq.status)}
                            </Text>
                          </View>
                          
                          <View style={styles.detailEquipmentBody}>
                            <View style={styles.detailRow}>
                              <Text style={styles.detailLabel}>Model Number</Text>
                              <Text style={styles.detailValue}>{eq.modelNumber || '-'}</Text>
                            </View>
                            
                            {eq.serviceTypeName && (
                              <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Service Type</Text>
                                <Text style={styles.detailValue}>{eq.serviceTypeName}</Text>
                              </View>
                            )}
                            
                            {eq.issueName && eq.issueName !== '-' && (
                              <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Issue</Text>
                                <Text style={styles.detailValue}>{eq.issueName}</Text>
                              </View>
                            )}
                            
                            {eq.remarks && eq.remarks !== '-' && (
                              <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Remarks</Text>
                                <Text style={styles.detailValue}>{eq.remarks}</Text>
                              </View>
                            )}
                            
                            {eq.serviceDate && (
                              <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Service Date</Text>
                                <Text style={styles.detailValue}>{formatDateOnly(eq.serviceDate)}</Text>
                              </View>
                            )}
                            
                            {serviceRateAmount > 0 && (
                              <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Service Rate</Text>
                                <Text style={[styles.detailValue, { color: '#1976d2', fontWeight: '500' }]}>
                                  {formatCurrency(serviceRateAmount)}
                                </Text>
                              </View>
                            )}
                            
                            {(eq.status === 'A' || eq.status === 'P') && eq.servicedByName && (
                              <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Assigned To</Text>
                                <Text style={[styles.detailValue, { color: '#F59E0B', fontWeight: '500' }]}>
                                  {eq.servicedByName}
                                </Text>
                              </View>
                            )}
                            
                            {eq.status === 'C' && eq.servicedByName && (
                              <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Completed By</Text>
                                <Text style={[styles.detailValue, { color: '#EF4444', fontWeight: '500' }]}>
                                  {eq.servicedByName}
                                </Text>
                              </View>
                            )}
                            
                            {eq.parts && eq.parts.length > 0 && (
                              <View style={styles.detailPartsContainer}>
                                <Text style={styles.detailPartsTitle}>Parts Used ({eq.parts.length})</Text>
                                <PartsTableHeader />
                                {eq.parts.map((part, pIdx) => (
                                  <PartsTableRow key={pIdx} part={part} index={pIdx} />
                                ))}
                                <View style={styles.detailPartsTotal}>
                                  <Text style={styles.detailTotalLabel}>Parts Total</Text>
                                  <Text style={styles.detailTotalAmount}>{formatCurrency(partsTotal)}</Text>
                                </View>
                              </View>
                            )}
                            
                            {equipmentTotal > 0 && (
                              <View style={styles.detailGrandTotal}>
                                <Text style={styles.detailGrandTotalLabel}>Equipment Total</Text>
                                <Text style={styles.detailGrandTotalAmount}>{formatCurrency(equipmentTotal)}</Text>
                              </View>
                            )}
                          </View>
                        </View>
                      );
                    })
                  ) : (
                    <View style={styles.detailNoEquipment}>
                      <Text style={styles.detailNoEquipmentText}>No equipment details available</Text>
                    </View>
                  )}
                </View>
              ) : (
                <View style={styles.modalCenter}>
                  <MaterialIcons name="error-outline" size={50} color="#cbd5e1" />
                  <Text style={styles.modalCenterText}>Failed to load details</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading Dashboard...</Text>
      </View>
    );
  }

  const sortedDistricts = getSortedDistricts();
  const revenueData = getRevenueData();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Dashboard</Text>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsRow}>
          <StatCard title="Customers" value={dashboardData.totalCustomers} icon="people-outline" color="#3b82f6" />
          <StatCard title="Plants" value={dashboardData.totalPlants} icon="business-outline" color="#22c55e" />
          <StatCard title="Services" value={dashboardData.totalServices} icon="settings-outline" color="#f59e0b" />
          <StatCard title="Revenue" value={formatCurrency(dashboardData.totalRevenue)} icon="cash-outline" color="#8b5cf6" />
        </View>

        {/* Report Selector */}
        <View style={styles.dropdownContainer}>
          <Text style={styles.dropdownLabel}>Select Report</Text>
          <View style={styles.dropdownWrapper}>
            <TouchableOpacity 
              style={[styles.dropdownItem, selectedReport === 'district' && styles.dropdownItemActive]}
              onPress={() => setSelectedReport('district')}
            >
              <Text style={[styles.dropdownText, selectedReport === 'district' && styles.dropdownTextActive]}>District Wise</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.dropdownItem, selectedReport === 'revenue' && styles.dropdownItemActive]}
              onPress={() => setSelectedReport('revenue')}
            >
              <Text style={[styles.dropdownText, selectedReport === 'revenue' && styles.dropdownTextActive]}>Revenue Trend</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.dropdownItem, selectedReport === 'status' && styles.dropdownItemActive]}
              onPress={() => setSelectedReport('status')}
            >
              <Text style={[styles.dropdownText, selectedReport === 'status' && styles.dropdownTextActive]}>Status Wise</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Chart Section */}
        <View style={styles.chartSection}>
          {selectedReport === 'district' && sortedDistricts.length > 0 ? (
            <>
              <Text style={styles.chartTitle}>Services by District</Text>
              <Text style={styles.chartSubtitle}>Tap on any bar to view services</Text>
              <HorizontalBarChart 
                data={sortedDistricts} 
                onBarPress={handleDistrictClick}
              />
            </>
          ) : selectedReport === 'district' && (
            <View style={styles.emptyState}>
              <MaterialIcons name="bar-chart" size={50} color="#e2e8f0" />
              <Text style={styles.emptyText}>No district data available</Text>
            </View>
          )}

          {selectedReport === 'revenue' && dashboardData.monthlyRevenue?.length > 0 ? (
            <>
              <Text style={styles.chartTitle}>Monthly Revenue Trend</Text>
              <Text style={styles.chartSubtitle}>Tap on any point to view services</Text>
              <LineChart
                data={revenueData}
                width={width - 48}
                height={220}
                chartConfig={{
                  backgroundColor: '#ffffff',
                  backgroundGradientFrom: '#ffffff',
                  backgroundGradientTo: '#ffffff',
                  decimalPlaces: 0,
                  color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                  style: { borderRadius: 16 },
                }}
                bezier
                onDataPointClick={(data) => {
                  const item = dashboardData.monthlyRevenue[data.index];
                  if (item) {
                    let year = '', month = '';
                    if (item.monthKey) {
                      [year, month] = item.monthKey.split('-');
                    } else if (item.month) {
                      const parts = item.month.split(' ');
                      month = parts[0];
                      year = parts[1];
                    }
                    if (year && month) {
                      handleRevenueClick(month, year);
                    }
                  }
                }}
                style={styles.chart}
              />
              <View style={styles.revenueStats}>
                <View style={styles.revenueStat}>
                  <Text style={styles.revenueStatLabel}>Highest</Text>
                  <Text style={styles.revenueStatValue}>{formatCurrency(Math.max(...dashboardData.monthlyRevenue.map(r => r.revenue || 0)))}</Text>
                </View>
                <View style={styles.revenueStat}>
                  <Text style={styles.revenueStatLabel}>Average</Text>
                  <Text style={styles.revenueStatValue}>{formatCurrency(dashboardData.monthlyRevenue.reduce((s, r) => s + (r.revenue || 0), 0) / dashboardData.monthlyRevenue.length)}</Text>
                </View>
                <View style={styles.revenueStat}>
                  <Text style={styles.revenueStatLabel}>Total</Text>
                  <Text style={styles.revenueStatValue}>{formatCurrency(dashboardData.monthlyRevenue.reduce((s, r) => s + (r.revenue || 0), 0))}</Text>
                </View>
              </View>
            </>
          ) : selectedReport === 'revenue' && (
            <View style={styles.emptyState}>
              <MaterialIcons name="show-chart" size={50} color="#e2e8f0" />
              <Text style={styles.emptyText}>No revenue data available</Text>
            </View>
          )}

          {selectedReport === 'status' && (
            <>
              <Text style={styles.chartTitle}>Service Status Distribution</Text>
              <Text style={styles.chartSubtitle}>Tap on any slice to view services</Text>
              <PieChart
                data={statusData}
                width={width - 48}
                height={220}
                chartConfig={{
                  backgroundColor: '#ffffff',
                  backgroundGradientFrom: '#ffffff',
                  backgroundGradientTo: '#ffffff',
                  decimalPlaces: 0,
                  color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                  style: { borderRadius: 16 },
                }}
                accessor="count"
                backgroundColor="transparent"
                paddingLeft="15"
                absolute
                onDataPointClick={(data) => handleStatusClick(data.name)}
              />
            </>
          )}
        </View>
      </ScrollView>

      {/* Services List Modal - IMPROVED TABLE */}
      <Modal visible={showModal} transparent animationType="slide" onRequestClose={() => setShowModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalHeaderTitle}>{modalTitle}</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>
            {modalLoading ? (
              <View style={styles.modalCenter}>
                <ActivityIndicator size="large" color="#3b82f6" />
                <Text style={styles.modalCenterText}>Loading services...</Text>
              </View>
            ) : modalData.length > 0 ? (
              <FlatList
                data={modalData}
                renderItem={({ item }) => <ServiceTableRow item={item} onPress={handleServiceDetail} />}
                keyExtractor={(item) => item.srid?.toString() || Math.random().toString()}
                contentContainerStyle={styles.modalList}
                ListHeaderComponent={<ModalTableHeader />}
                showsVerticalScrollIndicator={false}
              />
            ) : (
              <View style={styles.modalCenter}>
                <MaterialIcons name="info-outline" size={50} color="#e2e8f0" />
                <Text style={styles.modalCenterText}>No services found</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Service Detail Modal */}
      <ServiceDetailModal visible={showDetailModal} data={detailData} loading={detailLoading} onClose={() => setShowDetailModal(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },
  loadingText: { marginTop: 12, color: '#64748b', fontSize: 14 },
  
  // Header
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#0f172a' },
  
  // Stats
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, paddingTop: 8, gap: 12 },
  statCard: { width: '47%', backgroundColor: '#fff', borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 },
  statIcon: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  statInfo: { flex: 1 },
  statValue: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  statTitle: { fontSize: 11, color: '#64748b', marginTop: 2 },
  
  // Dropdown
  dropdownContainer: { paddingHorizontal: 16, paddingTop: 12 },
  dropdownLabel: { fontSize: 13, fontWeight: '500', color: '#64748b', marginBottom: 8 },
  dropdownWrapper: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12, padding: 4, borderWidth: 1, borderColor: '#e2e8f0' },
  dropdownItem: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  dropdownItemActive: { backgroundColor: '#3b82f6' },
  dropdownText: { fontSize: 12, color: '#64748b', fontWeight: '500' },
  dropdownTextActive: { color: '#fff' },
  
  // Chart
  chartSection: { backgroundColor: '#fff', marginHorizontal: 16, marginTop: 16, marginBottom: 20, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  chartTitle: { fontSize: 15, fontWeight: '600', color: '#0f172a', textAlign: 'center' },
  chartSubtitle: { fontSize: 11, color: '#94a3b8', textAlign: 'center', marginBottom: 12 },
  chart: { borderRadius: 12, marginVertical: 8 },
  
  horizontalChartContainer: { marginTop: 10, marginBottom: 10 },
  horizontalBarRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  horizontalBarLabel: { width: 100, fontSize: 13, color: '#334155', fontWeight: '500' },
  horizontalBarWrapper: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  horizontalBar: { height: 28, backgroundColor: '#3b82f6', borderRadius: 6, minWidth: 4 },
  horizontalBarValue: { marginLeft: 10, fontSize: 13, fontWeight: '600', color: '#3b82f6', width: 35 },
  
  revenueStats: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  revenueStat: { alignItems: 'center' },
  revenueStatLabel: { fontSize: 10, color: '#64748b' },
  revenueStatValue: { fontSize: 12, fontWeight: '600', color: '#22c55e', marginTop: 4 },
  
  emptyState: { alignItems: 'center', paddingVertical: 50 },
  emptyText: { marginTop: 12, color: '#94a3b8', fontSize: 14 },
  
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContainer: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: height * 0.85 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  modalHeaderTitle: { fontSize: 18, fontWeight: '600', color: '#0f172a' },
  modalList: { padding: 16 },
  modalCenter: { padding: 50, alignItems: 'center' },
  modalCenterText: { marginTop: 10, color: '#64748b' },
  
  // ✅ IMPROVED TABLE STYLES - Proper column alignment
  modalTableHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingVertical: 14, 
    paddingHorizontal: 16, 
    backgroundColor: '#f1f5f9', 
    borderRadius: 10, 
    marginBottom: 8
  },
  headerText: { fontSize: 12, fontWeight: '600', color: '#475569' },
  headerId: { width: 80 },
  headerPlant: { flex: 2 },
  headerStatus: { width: 90 },
  headerDate: { width: 105 },
  headerArrow: { width: 30 },
  
  modalTableRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingVertical: 14, 
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#f1f5f9'
  },
  
  cellId: { width: 80 },
  cellPlant: { flex: 2 },
  cellStatus: { width: 90 },
  cellDate: { width: 105 },
  cellArrow: { width: 30, alignItems: 'flex-end' },
  
  cellIdText: { fontSize: 13, fontWeight: '600', color: '#3b82f6' },
  cellPlantText: { fontSize: 13, color: '#334155' },
  cellStatusText: { fontSize: 13, fontWeight: '600' },
  cellDateText: { fontSize: 12, color: '#64748b' },
  
  // Parts Table
  partsTableHeader: { flexDirection: 'row', backgroundColor: '#E3F2FD', paddingVertical: 8, paddingHorizontal: 10, borderRadius: 8, marginBottom: 4 },
  partsHeaderText: { fontSize: 11, fontWeight: '600', color: '#1565C0' },
  partsHeaderName: { flex: 2 },
  partsHeaderQty: { width: 50, textAlign: 'center' },
  partsHeaderRate: { width: 80, textAlign: 'right' },
  partsHeaderTotal: { width: 90, textAlign: 'right' },
  
  partsTableRow: { flexDirection: 'row', paddingVertical: 8, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  partsEvenRow: { backgroundColor: '#fff' },
  partsOddRow: { backgroundColor: '#fafafa' },
  partsCell: { fontSize: 11, color: '#333' },
  partsCellName: { flex: 2 },
  partsCellQty: { width: 50, textAlign: 'center', color: '#666' },
  partsCellRate: { width: 80, textAlign: 'right', color: '#666' },
  partsCellTotal: { width: 90, textAlign: 'right', fontWeight: '600', color: '#2e7d32' },
  
  // Detail Modal
  detailOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  detailModal: { backgroundColor: '#fff', borderRadius: 20, width: width * 0.92, maxHeight: height * 0.85, overflow: 'hidden' },
  detailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  detailTitle: { fontSize: 18, fontWeight: '600', color: '#0f172a' },
  detailBody: { padding: 16 },
  detailSection: { marginBottom: 20, backgroundColor: '#f8fafc', borderRadius: 12, padding: 14 },
  detailSectionTitle: { fontSize: 14, fontWeight: '600', color: '#0f172a', marginBottom: 12, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  detailRow: { flexDirection: 'row', marginBottom: 10 },
  detailLabel: { width: 100, fontSize: 12, color: '#64748b' },
  detailValue: { flex: 1, fontSize: 12, color: '#334155' },
  
  detailEquipmentCard: { backgroundColor: '#fff', borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0', overflow: 'hidden' },
  detailEquipmentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, backgroundColor: '#f8fafc', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  detailEquipmentName: { fontSize: 14, fontWeight: '600', color: '#0f172a', flex: 1 },
  detailEquipmentStatus: { fontSize: 12, fontWeight: '600' },
  detailEquipmentBody: { padding: 12 },
  
  detailPartsContainer: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  detailPartsTitle: { fontSize: 13, fontWeight: '600', color: '#1976d2', marginBottom: 10 },
  
  detailPartsTotal: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#e0e0e0' },
  detailTotalLabel: { fontSize: 12, fontWeight: 'bold', color: '#333' },
  detailTotalAmount: { fontSize: 13, fontWeight: 'bold', color: '#2e7d32' },
  
  detailGrandTotal: { flexDirection: 'row', justifyContent: 'space-between',alignItems: 'center', marginTop: 12, paddingTop: 10, borderTopWidth: 2, borderTopColor: '#1976d2', backgroundColor: '#E3F2FD', paddingHorizontal: 12, paddingBottom: 10, borderRadius: 8 },
  detailGrandTotalLabel: { fontSize: 13, fontWeight: 'bold', color: '#1565C0' },
  detailGrandTotalAmount: { fontSize: 15, fontWeight: 'bold', color: '#2e7d32' },
  
  detailNoEquipment: { padding: 30, alignItems: 'center' },
  detailNoEquipmentText: { fontSize: 13, color: '#999' },
});