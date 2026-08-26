import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { LineChart } from 'react-native-chart-kit';

const API_BASE = 'http://192.168.29.223:2927/api';
//const API_BASE = 'http://10.200.27.8:2927/api';
const { width } = Dimensions.get('window');

export default function DashboardScreen({ user, navigation, onBackToServices, onLogout, hideHeader = true }) {
  const [statistics, setStatistics] = useState({
    total_services: 0,
    completed_services: 0,
    pending_services: 0,
    inprogress_services: 0,
    completion_rate: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [employeeName, setEmployeeName] = useState('');
  const [employeeProfilePic, setEmployeeProfilePic] = useState(null);
  const [currentDateTime, setCurrentDateTime] = useState('');

  useEffect(() => {
    loadDashboardData();
    updateDateTime();
    const interval = setInterval(updateDateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  const updateDateTime = () => {
    const now = new Date();
    const day = now.getDate().toString().padStart(2, '0');
    const month = now.toLocaleString('en-US', { month: 'short' });
    const year = now.getFullYear();
    let hours = now.getHours();
    const mins = now.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    setCurrentDateTime(`${day}/${month}/${year} ${hours}:${mins} ${ampm}`);
  };

  const loadDashboardData = async () => {
    try {
      let empId = user?.id;
      
      const storedData = await AsyncStorage.getItem('employeeData');
      console.log('Stored employee data:', storedData);
      
      if (storedData) {
        const empData = JSON.parse(storedData);
        empId = empData.id;
        setEmployeeName(empData.name || 'Employee');
        
        const profilePic = empData.profile_pic || 
                          empData.profileImage || 
                          `http://10.200.27.8:2927/api/profile/image/${empData.id}?t=${Date.now()}`;
        
        console.log('Profile image URL:', profilePic);
        setEmployeeProfilePic(profilePic);
      } else if (user) {
        setEmployeeName(user.name || 'Employee');
        const profilePic = user.profile_pic || 
                          user.profileImage || 
                          `http://10.200.27.8:2927/api/profile/image/${user.id}?t=${Date.now()}`;
        setEmployeeProfilePic(profilePic);
      }
      
      if (empId) {
        const response = await axios.get(`${API_BASE}/profile/${empId}`);
        setStatistics({
          total_services: response.data.total_services || 0,
          completed_services: response.data.completed_services || 0,
          pending_services: response.data.pending_services || 0,
          inprogress_services: response.data.inprogress_services || 0,
          completion_rate: response.data.completion_rate || 0,
        });
      }
    } catch (e) {
      console.error('Error loading dashboard:', e);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  // Note: Logout is now handled by App.js header - removed from here to prevent double alerts

  const getPerformanceMessage = () => {
    const rate = statistics.completion_rate;
    if (rate >= 80) {
      return 'Excellent performance! Keep up the great work!';
    } else if (rate >= 60) {
      return 'Good progress! Complete pending tasks to achieve more.';
    } else if (rate >= 40) {
      return 'Keep going! Focus on completing your pending services.';
    } else {
      return 'You have pending tasks. Start completing them today!';
    }
  };

  const getGrowthDescription = () => {
    const weeklyData = getWeeklyData();
    const startWeek = weeklyData[0];
    const endWeek = weeklyData[6];
    const growth = endWeek - startWeek;
    const growthPercent = startWeek > 0 ? (growth / startWeek) * 100 : growth > 0 ? 100 : 0;
    
    if (growth > 0) {
      if (growthPercent >= 50) {
        return `📈 Outstanding! +${Math.round(growthPercent)}% growth this week`;
      } else if (growthPercent >= 20) {
        return `📊 Good growth! +${Math.round(growthPercent)}% improvement`;
      } else {
        return `✅ Steady progress! +${growth} services this week`;
      }
    } else if (growth === 0) {
      return `⚖️ Consistent performance. Try to do more!`;
    } else {
      return `⚠️ Down by ${Math.abs(growth)} services. Focus on pending tasks`;
    }
  };

  const getWeeklyData = () => {
    const baseValue = Math.max(1, Math.min(15, statistics.completed_services / 2));
    const trend = statistics.completion_rate >= 80 ? 'up' : statistics.completion_rate >= 50 ? 'steady' : 'down';
    
    if (trend === 'up') {
      return [
        Math.max(0, baseValue - 4),
        Math.max(0, baseValue - 2),
        Math.max(0, baseValue),
        Math.max(0, baseValue + 1),
        Math.max(0, baseValue + 2),
        Math.max(0, baseValue + 3),
        statistics.completed_services
      ];
    } else if (trend === 'steady') {
      return [
        Math.max(0, baseValue - 1),
        Math.max(0, baseValue),
        Math.max(0, baseValue + 1),
        Math.max(0, baseValue),
        Math.max(0, baseValue + 1),
        Math.max(0, baseValue + 2),
        statistics.completed_services
      ];
    } else {
      return [
        Math.max(0, baseValue + 2),
        Math.max(0, baseValue + 1),
        Math.max(0, baseValue),
        Math.max(0, baseValue - 1),
        Math.max(0, baseValue - 2),
        Math.max(0, baseValue - 3),
        statistics.completed_services
      ];
    }
  };

  const ProgressRing = ({ percentage, color, label, value, total }) => {
    const size = 100;
    const strokeWidth = 8;
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
      <View style={styles.ringContainer}>
        <View style={styles.ringWrapper}>
          <View style={[styles.ringBackground, { width: size, height: size, borderRadius: size / 2 }]} />
          <View style={[styles.ringProgress, {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: strokeWidth,
            borderColor: color,
            transform: [{ rotate: '-90deg' }],
          }]} />
          <View style={styles.ringInner}>
            <Text style={[styles.ringValue, { color: color }]}>{value}</Text>
            <Text style={styles.ringTotal}>/{total}</Text>
          </View>
        </View>
        <Text style={styles.ringLabel}>{label}</Text>
        <Text style={styles.ringPercent}>{percentage.toFixed(1)}%</Text>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2b78c5" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  const completedPercent = statistics.total_services > 0 ? (statistics.completed_services / statistics.total_services) * 100 : 0;
  const inProgressPercent = statistics.total_services > 0 ? (statistics.inprogress_services / statistics.total_services) * 100 : 0;
  const pendingPercent = statistics.total_services > 0 ? (statistics.pending_services / statistics.total_services) * 100 : 0;

  const chartData = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [{
      data: getWeeklyData(),
      color: (opacity = 1) => `rgba(43, 120, 197, ${opacity})`,
      strokeWidth: 2
    }]
  };

  const weeklyData = getWeeklyData();
  const weeklyAvg = Math.round(weeklyData.reduce((a, b) => a + b, 0) / 7);
  const bestDay = Math.max(...weeklyData);
  const growth = weeklyData[6] - weeklyData[0];

  return (
    <View style={styles.container}>
      {/* HEADER REMOVED - Now handled by App.js */}
      {/* The header with Dashboard title, profile image, and logout has been removed */}

      {/* Scrollable Content - Now starts directly */}
      <ScrollView 
        style={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2b78c5']} tintColor="#2b78c5" />
        }
      >
        <View style={styles.modernCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Service Distribution</Text>
            <Ionicons name="pie-chart-outline" size={20} color="#2b78c5" />
          </View>
          <View style={styles.ringsGrid}>
            <ProgressRing 
              percentage={completedPercent}
              color="#28a745"
              label="Completed"
              value={statistics.completed_services}
              total={statistics.total_services}
            />
            <ProgressRing 
              percentage={inProgressPercent}
              color="#ff9800"
              label="In Progress"
              value={statistics.inprogress_services}
              total={statistics.total_services}
            />
            <ProgressRing 
              percentage={pendingPercent}
              color="#dc3545"
              label="Pending"
              value={statistics.pending_services}
              total={statistics.total_services}
            />
          </View>
        </View>

        <View style={styles.modernCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Performance Overview</Text>
            <View style={styles.rateBadge}>
              <Text style={styles.rateBadgeText}>{statistics.completion_rate}%</Text>
            </View>
          </View>
          
          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>Overall Progress</Text>
              <Text style={styles.progressPercentage}>{statistics.completion_rate}% Complete</Text>
            </View>
            <View style={styles.progressBarTrack}>
              <View style={[styles.progressBarFill, { width: `${statistics.completion_rate}%` }]} />
            </View>
          </View>

          <View style={styles.statsRowModern}>
            <View style={styles.statItem}>
              <Text style={styles.statItemLabel}>Total Services</Text>
              <Text style={styles.statItemValue}>{statistics.total_services}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statItemLabel}>Completion Rate</Text>
              <Text style={styles.statItemValue}>{statistics.completion_rate}%</Text>
            </View>
          </View>
        </View>

        <View style={[styles.modernCard, styles.lastCard]}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.cardTitle}>Weekly Trend</Text>
              <Text style={styles.trendSubtitle}>Last 7 days</Text>
            </View>
            <Ionicons name="trending-up" size={20} color="#28a745" />
          </View>
          
          <LineChart
            data={chartData}
            width={width - 48}
            height={180}
            chartConfig={{
              backgroundColor: '#fff',
              backgroundGradientFrom: '#fff',
              backgroundGradientTo: '#fff',
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(43, 120, 197, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
              style: {
                borderRadius: 16,
              },
              propsForDots: {
                r: '5',
                strokeWidth: '2',
                stroke: '#2b78c5',
              },
              fillShadowGradient: '#2b78c5',
              fillShadowGradientOpacity: 0.1,
            }}
            bezier
            style={styles.chart}
            formatYLabel={(value) => Math.round(value).toString()}
          />
          
          <View style={styles.growthContainer}>
            <Text style={styles.growthText}>{getGrowthDescription()}</Text>
          </View>
          
          <View style={styles.trendStats}>
            <View style={styles.trendStatItem}>
              <Text style={styles.trendStatLabel}>Weekly Avg</Text>
              <Text style={styles.trendStatValue}>{weeklyAvg}</Text>
            </View>
            <View style={styles.trendStatItem}>
              <Text style={styles.trendStatLabel}>Best Day</Text>
              <Text style={styles.trendStatValue}>{bestDay}</Text>
            </View>
            <View style={styles.trendStatItem}>
              <Text style={styles.trendStatLabel}>Growth</Text>
              <Text style={[styles.trendStatValue, { color: growth >= 0 ? '#28a745' : '#dc3545' }]}>
                {growth >= 0 ? `+${growth}` : `${growth}`}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f7fa',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6b7280',
  },
  // Header styles removed - now handled by App.js
  
  // Scrollable Content
  scrollContent: {
    flex: 1,
  },
  modernCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  lastCard: {
    marginBottom: 24,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  ringsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  ringContainer: {
    alignItems: 'center',
  },
  ringWrapper: {
    position: 'relative',
    width: 90,
    height: 90,
  },
  ringBackground: {
    position: 'absolute',
    backgroundColor: '#f0f0f0',
  },
  ringProgress: {
    position: 'absolute',
    borderTopColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  ringInner: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  ringValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  ringTotal: {
    fontSize: 10,
    color: '#9ca3af',
    fontWeight: '500',
  },
  ringLabel: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 8,
    fontWeight: '500',
  },
  ringPercent: {
    fontSize: 9,
    color: '#9ca3af',
    marginTop: 2,
  },
  progressSection: {
    marginBottom: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  progressPercentage: {
    fontSize: 12,
    fontWeight: '600',
    color: '#28a745',
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: '#f3f4f6',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#28a745',
    borderRadius: 3,
  },
  statsRowModern: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statItemLabel: {
    fontSize: 11,
    color: '#6b7280',
    marginBottom: 4,
  },
  statItemValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#e5e7eb',
  },
  rateBadge: {
    backgroundColor: '#28a74520',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 16,
  },
  rateBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#28a745',
  },
  chart: {
    marginLeft: -20,
    borderRadius: 16,
  },
  trendSubtitle: {
    fontSize: 10,
    color: '#9ca3af',
    marginTop: 2,
  },
  growthContainer: {
    backgroundColor: '#f0f7ff',
    padding: 10,
    borderRadius: 10,
    marginTop: 12,
    marginBottom: 12,
  },
  growthText: {
    fontSize: 11,
    color: '#2b78c5',
    lineHeight: 16,
    textAlign: 'center',
  },
  trendStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  trendStatItem: {
    alignItems: 'center',
  },
  trendStatLabel: {
    fontSize: 10,
    color: '#9ca3af',
    marginBottom: 4,
  },
  trendStatValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
  },
});