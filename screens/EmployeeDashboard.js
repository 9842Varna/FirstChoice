import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  ScrollView,
  Alert,
  Dimensions,
  StatusBar,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import * as DocumentPicker from 'expo-document-picker';
import DateTimePicker from '@react-native-community/datetimepicker';

const API_BASE = 'http://192.168.29.223:2927/api';
//const API_URL = "http://10.196.32.8:2927/api/login";
const { width, height } = Dimensions.get('window');

export default function EmployeeDashboardScreen({ user, onLogout, hideHeader = true }) {
  const [serviceRequests, setServiceRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [employeeId, setEmployeeId] = useState(null);
  const [viewDetailsModal, setViewDetailsModal] = useState(false);
  const [viewingPlant, setViewingPlant] = useState(null);
  const [updateModalVisible, setUpdateModalVisible] = useState(false);
  const [updateData, setUpdateData] = useState(null);
  const [groupedPlants, setGroupedPlants] = useState([]);
  const [showNotificationDropdown, setShowNotificationDropdown] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [newServiceIds, setNewServiceIds] = useState(new Set());
  const [newPlantNames, setNewPlantNames] = useState(new Set());
  const previousServicesRef = useRef([]);
  const [expandedPlants, setExpandedPlants] = useState({});
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [tempDate, setTempDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateFilterActive, setDateFilterActive] = useState(false);
  const [selectedPlant, setSelectedPlant] = useState('');
  const [allPlantNames, setAllPlantNames] = useState([]);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);

  useEffect(() => {
    loadEmployeeData();
  }, []);

  useEffect(() => {
    filterAndSortServices();
  }, [serviceRequests, selectedStatus, searchQuery, selectedDate, selectedPlant]);

  useEffect(() => {
    if (employeeId) {
      const interval = setInterval(() => {
        checkForNewAssignments();
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [employeeId]);

  const loadEmployeeData = async () => {
    try {
      let empId = employeeId;
      if (!empId) {
        const empData = await AsyncStorage.getItem('employeeData');
        if (empData) {
          const data = JSON.parse(empData);
          empId = data.id;
          setEmployeeId(empId);
        } else if (user) {
          empId = user.id;
          setEmployeeId(empId);
        }
      }
      if (empId) await fetchDashboard(empId);
    } catch (error) {
      console.error('Error:', error);
      setLoading(false);
    }
  };

  const checkForNewAssignments = async () => {
    if (!employeeId) return;
    
    try {
      const response = await axios.get(`${API_BASE}/dashboard/${employeeId}`);
      if (response.data && response.data.complaints) {
        const newServices = response.data.complaints;
        const oldServices = previousServicesRef.current;
        
        if (oldServices.length === 0) {
          previousServicesRef.current = JSON.parse(JSON.stringify(newServices));
          setServiceRequests(newServices);
          const uniquePlants = [...new Set(newServices.map(s => s.plant).filter(Boolean))];
          setAllPlantNames(uniquePlants);
          return;
        }
        
        let hasNewService = false;
        const newServiceList = [];
        const newPlantSet = new Set();
        
        const oldServiceIds = new Set(oldServices.map(s => s.id));
        for (const newService of newServices) {
          if (!oldServiceIds.has(newService.id)) {
            hasNewService = true;
            newServiceList.push(newService);
            newPlantSet.add(newService.plant);
            
            setNotifications(prev => [{
              id: `service_${newService.id}_${Date.now()}`,
              message: `✨ New service SR-${newService.id} assigned at ${newService.plant}`,
              read: false,
              timestamp: new Date().toISOString()
            }, ...prev]);
          }
        }
        
        if (hasNewService) {
          setNewServiceIds(prev => {
            const updated = new Set(prev);
            newServiceList.forEach(s => updated.add(s.id));
            return updated;
          });
          setNewPlantNames(prev => {
            const updated = new Set(prev);
            newPlantSet.forEach(plant => updated.add(plant));
            return updated;
          });
          setShowNotificationDropdown(true);
          setTimeout(() => setShowNotificationDropdown(false), 5000);
          
          setTimeout(() => {
            setNewServiceIds(prev => {
              const updated = new Set(prev);
              newServiceList.forEach(s => updated.delete(s.id));
              return updated;
            });
            setNewPlantNames(prev => {
              const updated = new Set(prev);
              newPlantSet.forEach(plant => updated.delete(plant));
              return updated;
            });
          }, 30000);
        }
        
        setServiceRequests(newServices);
        previousServicesRef.current = JSON.parse(JSON.stringify(newServices));
        
        const uniquePlants = [...new Set(newServices.map(s => s.plant).filter(Boolean))];
        setAllPlantNames(uniquePlants);
      }
    } catch (error) {
      console.error('Auto refresh error:', error);
    }
  };

  const fetchDashboard = async (empId) => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/dashboard/${empId}`);
      if (response.data && response.data.complaints) {
        const sorted = response.data.complaints.sort((a, b) => {
          const dateA = a.date?.split('/').reverse().join('-') || '';
          const dateB = b.date?.split('/').reverse().join('-') || '';
          return new Date(dateB) - new Date(dateA);
        });
        setServiceRequests(sorted);
        previousServicesRef.current = JSON.parse(JSON.stringify(sorted));
        
        const uniquePlants = [...new Set(sorted.map(s => s.plant).filter(Boolean))];
        setAllPlantNames(uniquePlants);
        
        setNewServiceIds(new Set());
        setNewPlantNames(new Set());
        setNotifications([]);
      } else {
        setServiceRequests([]);
        previousServicesRef.current = [];
      }
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Error', 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const getStatusPriority = (service) => {
    const equipmentList = service.equipmentList || [];
    const total = equipmentList.length;
    const completed = equipmentList.filter(eq => eq.status === 'C').length;
    if (total === 0) return 1;
    if (completed === 0) return 2;
    if (completed > 0 && completed < total) return 3;
    return 4;
  };

  const filterAndSortServices = () => {
    let filtered = [...serviceRequests];

    if (selectedStatus === 'all') {
      filtered = filtered;
    } else if (selectedStatus === 'assigned') {
      filtered = filtered.filter(req => {
        const equipmentList = req.equipmentList || [];
        if (equipmentList.length === 0) return false;
        return equipmentList.every(eq => eq.status !== 'C');
      });
    } else if (selectedStatus === 'pending') {
      filtered = filtered.filter(req => {
        const equipmentList = req.equipmentList || [];
        if (equipmentList.length === 0) return false;
        const total = equipmentList.length;
        const completed = equipmentList.filter(eq => eq.status === 'C').length;
        return completed > 0 && completed < total;
      });
    } else if (selectedStatus === 'completed') {
      filtered = filtered.filter(req => {
        const equipmentList = req.equipmentList || [];
        if (equipmentList.length === 0) return false;
        return equipmentList.every(eq => eq.status === 'C');
      });
    }

    if (selectedDate) {
      filtered = filtered.filter(req => {
        const reqDate = req.date;
        if (!reqDate || reqDate === 'N/A') return false;
        return reqDate === selectedDate;
      });
    }

    if (selectedPlant && selectedPlant !== 'all') {
      filtered = filtered.filter(req => req.plant === selectedPlant);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(req =>
        req.plant?.toLowerCase().includes(query) ||
        req.id?.toString().includes(query)
      );
    }

    const sorted = filtered.sort((a, b) => {
      const dateA = a.date?.split('/').reverse().join('-') || '';
      const dateB = b.date?.split('/').reverse().join('-') || '';
      const dateCompare = new Date(dateB) - new Date(dateA);
      if (dateCompare !== 0) return dateCompare;
      return getStatusPriority(a) - getStatusPriority(b);
    });

    const grouped = groupServicesByPlant(sorted);
    setGroupedPlants(grouped);
  };

  const groupServicesByPlant = (services) => {
    const plantMap = new Map();
    services.forEach(service => {
      const plantName = service.plant;
      if (!plantName) return;
      if (!plantMap.has(plantName)) {
        plantMap.set(plantName, {
          plantName: plantName,
          services: [],
          totalServices: 0,
          completedCount: 0,
          pendingCount: 0,
          inProgressCount: 0
        });
      }
      const plant = plantMap.get(plantName);
      const serviceCopy = JSON.parse(JSON.stringify(service));
      plant.services.push(serviceCopy);
      plant.totalServices++;
      const equipmentList = service.equipmentList || [];
      const totalEquipment = equipmentList.length;
      const completedEquipment = equipmentList.filter(eq => eq.status === 'C').length;
      if (totalEquipment > 0 && completedEquipment === 0) plant.pendingCount++;
      else if (totalEquipment > 0 && completedEquipment > 0 && completedEquipment < totalEquipment) plant.inProgressCount++;
      else if (totalEquipment > 0 && completedEquipment === totalEquipment) plant.completedCount++;
    });
    return Array.from(plantMap.values());
  };

  const getPlantOverallStatus = (plant) => {
    if (plant.pendingCount > 0) return { text: 'Pending', color: '#FF9800' };
    if (plant.inProgressCount > 0) return { text: 'In Progress', color: '#4CAF50' };
    if (plant.completedCount === plant.totalServices && plant.totalServices > 0) return { text: 'Completed', color: '#EF4444' };
    return { text: 'No Services', color: '#9E9E9E' };
  };

  const getPlantLastServicedDate = (services) => {
    if (!services || services.length === 0) return null;
    let latestDate = null;
    services.forEach(service => {
      if (service.equipmentList && service.equipmentList.length > 0) {
        service.equipmentList.forEach(eq => {
          if (eq.status === 'C' && eq.serviceDate && eq.serviceDate !== '-') {
            const parts = eq.serviceDate.split('/');
            if (parts.length === 3) {
              const currentDate = new Date(parts[2], parts[1] - 1, parts[0]);
              if (!latestDate || currentDate > latestDate) latestDate = currentDate;
            }
          }
        });
      }
    });
    if (latestDate) {
      const day = latestDate.getDate().toString().padStart(2, '0');
      const month = (latestDate.getMonth() + 1).toString().padStart(2, '0');
      const year = latestDate.getFullYear();
      return `${day}/${month}/${year}`;
    }
    return null;
  };

  const getServiceCompletionDate = (service) => {
    if (!service.equipmentList || service.equipmentList.length === 0) return null;
    const allCompleted = service.equipmentList.every(eq => eq.status === 'C');
    if (!allCompleted) return null;
    let latestDate = null;
    service.equipmentList.forEach(eq => {
      if (eq.serviceDate && eq.serviceDate !== '-') {
        const parts = eq.serviceDate.split('/');
        if (parts.length === 3) {
          const currentDate = new Date(parts[2], parts[1] - 1, parts[0]);
          if (!latestDate || currentDate > latestDate) latestDate = currentDate;
        }
      }
    });
    if (latestDate) {
      const day = latestDate.getDate().toString().padStart(2, '0');
      const month = (latestDate.getMonth() + 1).toString().padStart(2, '0');
      const year = latestDate.getFullYear();
      return `${day}/${month}/${year}`;
    }
    return null;
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    previousServicesRef.current = [];
    loadEmployeeData().finally(() => setRefreshing(false));
  }, []);

  const openUpdateService = (service, equipment) => {
    setUpdateData({ service, equipment });
    setUpdateModalVisible(true);
  };

  const openPlantDetails = (service) => {
    setViewingPlant(service);
    setViewDetailsModal(true);
  };

  const handleServiceUpdateComplete = () => {
    setUpdateModalVisible(false);
    loadEmployeeData();
  };

  const getLatestCompletionDate = (equipmentList) => {
    if (!equipmentList || equipmentList.length === 0) return null;
    const completedDates = equipmentList
      .filter(eq => eq.status === 'C' && eq.serviceDate)
      .map(eq => {
        const parts = eq.serviceDate.split('/');
        if (parts.length === 3) return new Date(parts[2], parts[1] - 1, parts[0]);
        return null;
      })
      .filter(date => date !== null);
    if (completedDates.length === 0) return null;
    const latestDate = new Date(Math.max(...completedDates));
    const day = latestDate.getDate().toString().padStart(2, '0');
    const month = (latestDate.getMonth() + 1).toString().padStart(2, '0');
    const year = latestDate.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const getStatusCounts = () => {
    let all = serviceRequests.length;
    let assigned = 0, pending = 0, completed = 0;
    serviceRequests.forEach(req => {
      const equipmentList = req.equipmentList || [];
      const totalEquipment = equipmentList.length;
      const completedEquipment = equipmentList.filter(eq => eq.status === 'C').length;
      if (totalEquipment > 0 && completedEquipment === 0) assigned++;
      else if (totalEquipment > 0 && completedEquipment > 0 && completedEquipment < totalEquipment) pending++;
      else if (totalEquipment > 0 && completedEquipment === totalEquipment) completed++;
    });
    return { all, assigned, pending, completed };
  };

  const getStatusCountsWithColors = () => {
    let assigned = 0, pending = 0, completed = 0;
    serviceRequests.forEach(req => {
      const equipmentList = req.equipmentList || [];
      const totalEquipment = equipmentList.length;
      const completedEquipment = equipmentList.filter(eq => eq.status === 'C').length;
      if (totalEquipment > 0 && completedEquipment === 0) assigned++;
      else if (totalEquipment > 0 && completedEquipment > 0 && completedEquipment < totalEquipment) pending++;
      else if (totalEquipment > 0 && completedEquipment === totalEquipment) completed++;
    });
    return { assigned, pending, completed, total: serviceRequests.length };
  };

  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setTempDate(selectedDate);
      const day = selectedDate.getDate().toString().padStart(2, '0');
      const month = (selectedDate.getMonth() + 1).toString().padStart(2, '0');
      const year = selectedDate.getFullYear();
      const formattedDate = `${day}/${month}/${year}`;
      setSelectedDate(formattedDate);
      setDateFilterActive(true);
    }
    setShowFilterDropdown(false);
  };

  const handlePlantSelect = (plant) => {
    setSelectedPlant(plant);
    setShowFilterDropdown(false);
  };

  const togglePlant = (plantName) => {
    setExpandedPlants(prev => ({
      ...prev,
      [plantName]: !prev[plantName]
    }));
  };

  const getFilterDisplayText = () => {
    const filters = [];
    if (selectedDate) filters.push(`Date: ${selectedDate}`);
    if (selectedPlant && selectedPlant !== 'all') filters.push(`${selectedPlant}`);
    if (filters.length === 0) return 'Filter';
    return filters.join(' • ');
  };

  const markNotificationAsRead = (id) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === id ? { ...notif, read: true } : notif
      )
    );
  };

  const clearAllNotifications = () => {
    setNotifications([]);
    setShowNotificationDropdown(false);
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const getServiceStatusText = (service) => {
    const equipmentList = service.equipmentList || [];
    const totalEquipment = equipmentList.length;
    const completedEquipment = equipmentList.filter(eq => eq.status === 'C').length;
    
    if (totalEquipment === 0) return 'No Equipment';
    if (completedEquipment === 0) return 'Assigned';
    if (completedEquipment > 0 && completedEquipment < totalEquipment) return 'In Progress';
    return 'Completed';
  };

  const getServiceStatusColor = (service) => {
    const equipmentList = service.equipmentList || [];
    const totalEquipment = equipmentList.length;
    const completedEquipment = equipmentList.filter(eq => eq.status === 'C').length;
    
    if (totalEquipment === 0) return '#9E9E9E';
    if (completedEquipment === 0) return '#FF9800';
    if (completedEquipment > 0 && completedEquipment < totalEquipment) return '#4CAF50';
    return '#EF4444';
  };

  const isEquipmentNew = (service, equipment) => {
    if (equipment.status === 'C') return false;
    if (equipment.status !== 'A') return false;
    
    if (!service.date || service.date === '-') return false;
    
    const parts = service.date.split('/');
    if (parts.length !== 3) return false;
    
    const requestDate = new Date(parts[2], parts[1] - 1, parts[0]);
    const today = new Date();
    const diffTime = today - requestDate;
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    
    return diffDays <= 7;
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1976d2" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#1976d2" barStyle="light-content" translucent={false} />
      
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerLeft} />
          <View style={styles.headerRight}>
            <TouchableOpacity 
              style={styles.notificationIcon}
              onPress={() => setShowStatusModal(true)}
            >
              <Ionicons name="notifications-outline" size={24} color="#fff" />
              {unreadCount > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>{unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {showNotificationDropdown && (
        <TouchableWithoutFeedback onPress={() => setShowNotificationDropdown(false)}>
          <View style={styles.notificationOverlay}>
            <TouchableWithoutFeedback onPress={e => e.stopPropagation()}>
              <View style={styles.notificationDropdown}>
                <View style={styles.notificationDropdownHeader}>
                  <Text style={styles.notificationDropdownTitle}>Notifications</Text>
                  {notifications.length > 0 && (
                    <TouchableOpacity onPress={clearAllNotifications}>
                      <Text style={styles.clearAllText}>Clear all</Text>
                    </TouchableOpacity>
                  )}
                </View>
                {notifications.length === 0 ? (
                  <View style={styles.noNotificationsDropdown}>
                    <Text style={styles.noNotificationsText}>No notifications</Text>
                  </View>
                ) : (
                  notifications.map((item, index) => (
                    <TouchableOpacity 
                      key={index} 
                      style={[styles.notificationDropdownItem, item.read && styles.notificationDropdownItemRead]}
                      onPress={() => markNotificationAsRead(item.id)}
                    >
                      <View style={styles.notificationDot}>
                        {!item.read && <View style={styles.unreadDotSmall} />}
                      </View>
                      <Text style={[styles.notificationDropdownMessage, item.read && styles.notificationDropdownMessageRead]}>
                        {item.message}
                      </Text>
                    </TouchableOpacity>
                  ))
                )}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      )}

      <View style={styles.filterRow}>
        <View style={styles.filterDropdownContainer}>
          <TouchableOpacity 
            style={[styles.filterBtn, (dateFilterActive || selectedPlant) && styles.filterBtnActive]}
            onPress={() => setShowFilterDropdown(!showFilterDropdown)}
          >
            <Ionicons name="options-outline" size={16} color={(dateFilterActive || selectedPlant) ? '#fff' : '#1976d2'} />
            <Text style={[styles.filterBtnText, (dateFilterActive || selectedPlant) && styles.filterBtnTextActive]}>
              {getFilterDisplayText()}
            </Text>
            <Ionicons name="chevron-down" size={12} color={(dateFilterActive || selectedPlant) ? '#fff' : '#1976d2'} />
          </TouchableOpacity>
          
          {showFilterDropdown && (
            <View style={styles.filterDropdownMenu}>
              <TouchableOpacity style={styles.filterOption} onPress={() => setShowDatePicker(true)}>
                <Ionicons name="calendar-outline" size={16} color="#1976d2" />
                <Text style={styles.filterOptionText}>
                  {selectedDate ? 'Change Date' : 'Select Date'}
                </Text>
              </TouchableOpacity>
              
              {selectedDate && (
                <TouchableOpacity style={styles.filterOptionClear} onPress={() => {
                  setSelectedDate('');
                  setDateFilterActive(false);
                  setShowFilterDropdown(false);
                }}>
                  <Ionicons name="close-circle" size={18} color="#d32f2f" />
                  <Text style={styles.filterOptionClearText}>{selectedDate}</Text>
                </TouchableOpacity>
              )}
              
              <View style={styles.filterDivider} />
              <TouchableOpacity 
                style={[styles.filterOption, selectedPlant === 'all' && styles.filterOptionActive]}
                onPress={() => handlePlantSelect('all')}
              >
                <Text style={[styles.filterOptionText, selectedPlant === 'all' && styles.filterOptionTextActive]}>All Plants</Text>
              </TouchableOpacity>
              {allPlantNames.map((plant, idx) => (
                <TouchableOpacity 
                  key={idx}
                  style={[styles.filterOption, selectedPlant === plant && styles.filterOptionActive]}
                  onPress={() => handlePlantSelect(plant)}
                >
                  <Text style={[styles.filterOptionText, selectedPlant === plant && styles.filterOptionTextActive]}>{plant}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={18} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={16} color="#999" />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.statusDropdownContainer}>
          <TouchableOpacity 
            style={styles.statusBtn}
            onPress={() => setShowStatusDropdown(!showStatusDropdown)}
          >
            <Text style={styles.statusBtnText}>
              {selectedStatus === 'all' ? 'All' :
               selectedStatus === 'assigned' ? 'Assigned' :
               selectedStatus === 'pending' ? 'Progress' : 'Completed'}
            </Text>
            <Ionicons name="chevron-down" size={12} color="#1976d2" />
          </TouchableOpacity>
          
          {showStatusDropdown && (
            <View style={styles.statusDropdownMenu}>
              <TouchableOpacity 
                style={[styles.statusOption, selectedStatus === 'all' && styles.statusOptionActive]}
                onPress={() => { setSelectedStatus('all'); setShowStatusDropdown(false); }}
              >
                <Text style={styles.statusOptionText}>All ({getStatusCounts().all})</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.statusOption, selectedStatus === 'assigned' && styles.statusOptionActive]}
                onPress={() => { setSelectedStatus('assigned'); setShowStatusDropdown(false); }}
              >
                <Text style={styles.statusOptionText}>Assigned ({getStatusCounts().assigned})</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.statusOption, selectedStatus === 'pending' && styles.statusOptionActive]}
                onPress={() => { setSelectedStatus('pending'); setShowStatusDropdown(false); }}
              >
                <Text style={styles.statusOptionText}>In Progress ({getStatusCounts().pending})</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.statusOption, selectedStatus === 'completed' && styles.statusOptionActive]}
                onPress={() => { setSelectedStatus('completed'); setShowStatusDropdown(false); }}
              >
                <Text style={styles.statusOptionText}>Completed ({getStatusCounts().completed})</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      {showDatePicker && (
        <DateTimePicker
          value={tempDate}
          mode="date"
          display="default"
          onChange={onDateChange}
        />
      )}

      <FlatList
        data={groupedPlants}
        keyExtractor={(item, index) => item.plantName + index}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#1976d2']} />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="checkmark-done-circle-outline" size={60} color="#4CAF50" />
            <Text style={styles.emptyTitle}>All caught up!</Text>
            <Text style={styles.emptyText}>No pending services</Text>
          </View>
        }
        renderItem={({ item: plant }) => {
          const overallStatus = getPlantOverallStatus(plant);
          const isExpanded = expandedPlants[plant.plantName];
          const isNewPlant = newPlantNames.has(plant.plantName);
          const lastServiced = getPlantLastServicedDate(plant.services);
          
          const sortedServices = [...plant.services].sort((a, b) => {
            const priorityA = getStatusPriority(a);
            const priorityB = getStatusPriority(b);
            return priorityA - priorityB;
          });
          
          return (
            <View style={styles.treeviewContainer}>
              <TouchableOpacity 
                style={[styles.treeviewHeader, isNewPlant && styles.newPlantHeader]}
                onPress={() => togglePlant(plant.plantName)}
                activeOpacity={0.7}
              >
                <View style={styles.treeviewLeft}>
                  <Ionicons 
                    name={isExpanded ? "chevron-down" : "chevron-forward"} 
                    size={18} 
                    color="#1976d2" 
                  />
                  <View>
                    <Text style={styles.treeviewPlantName}>{plant.plantName}</Text>
                    {isNewPlant && (
                      <View style={styles.plantNewBadge}>
                        <Text style={styles.plantNewBadgeText}>NEW</Text>
                      </View>
                    )}
                    {lastServiced && (
                      <Text style={styles.treeviewLastServiced}>
                        Last serviced: {lastServiced}
                      </Text>
                    )}
                  </View>
                </View>
                
                <View style={styles.treeviewRight}>
                  <Text style={[styles.treeviewBadgeText, { color: overallStatus.color }]}>
                    {overallStatus.text}
                  </Text>
                  <Text style={styles.treeviewCount}>
                    {plant.completedCount}/{plant.totalServices}
                  </Text>
                </View>
              </TouchableOpacity>
              
              {isExpanded && (
                <View style={styles.treeviewContent}>
                  <View style={styles.treeviewStats}>
                    <View style={styles.treeviewStat}>
                      <Ionicons name="document-text-outline" size={14} color="#666" />
                      <Text style={styles.treeviewStatText}>Total: {plant.totalServices}</Text>
                    </View>
                    <View style={styles.treeviewStat}>
                      <Ionicons name="checkmark-circle-outline" size={14} color="#EF4444" />
                      <Text style={styles.treeviewStatText}>Done: {plant.completedCount}</Text>
                    </View>
                    <View style={styles.treeviewStat}>
                      <Ionicons name="refresh-circle" size={14} color="#4CAF50" />
                      <Text style={styles.treeviewStatText}>Progress: {plant.inProgressCount}</Text>
                    </View>
                    <View style={styles.treeviewStat}>
                      <Ionicons name="time-outline" size={14} color="#FF9800" />
                      <Text style={styles.treeviewStatText}>Pending: {plant.pendingCount}</Text>
                    </View>
                  </View>
                  
                  {sortedServices.map((service, idx) => {
                    const allCompleted = service.equipmentList?.length > 0 && service.equipmentList?.every(eq => eq.status === 'C');
                    const totalEquipment = service.equipmentList?.length || 0;
                    const completedEquipment = service.equipmentList?.filter(eq => eq.status === 'C').length || 0;
                    const isNewService = newServiceIds.has(service.id);
                    const statusText = getServiceStatusText(service);
                    const statusColor = getServiceStatusColor(service);
                    
                    let displayEquipment = service.equipmentList || [];
                    if (selectedStatus === 'assigned') displayEquipment = displayEquipment.filter(eq => eq.status !== 'C');
                    else if (selectedStatus === 'pending') displayEquipment = displayEquipment.filter(eq => eq.status !== 'C');
                    
                    if (displayEquipment.length === 0 && selectedStatus !== 'completed' && selectedStatus !== 'all') return null;
                    if (selectedStatus === 'completed' && !allCompleted) return null;
                    
                    return (
                      <View key={idx} style={[styles.treeviewServiceItem, isNewService && styles.newServiceItem]}>
                        {isNewService && (
                          <View style={styles.newBadge}>
                            <Text style={styles.newBadgeText}>NEW</Text>
                          </View>
                        )}
                        
                        <View style={styles.serviceItemHeader}>
                          <View style={styles.serviceIdContainer}>
                            <Ionicons name="qr-code-outline" size={14} color="#1976d2" />
                            <Text style={styles.serviceId}>SR-{service.id}</Text>
                          </View>
                          <Text style={[styles.serviceStatusText, { color: statusColor }]}>
                            {statusText}
                          </Text>
                        </View>
                        
                        <View style={styles.serviceDateRow}>
                          <Ionicons name="calendar-outline" size={10} color="#666" />
                          <Text style={styles.serviceDate}>Request: {service.date}</Text>
                        </View>

                        {getServiceCompletionDate(service) && (
                          <View style={styles.serviceDateRow}>
                            <Ionicons name="checkmark-done-circle" size={10} color="#EF4444" />
                            <Text style={[styles.serviceDate, { color: '#EF4444' }]}>Completed: {getServiceCompletionDate(service)}</Text>
                          </View>
                        )}

                        <View style={styles.equipmentListContainer}>
                          <Text style={styles.equipmentListTitle}>Equipment ({displayEquipment.length})</Text>
                          {displayEquipment.map((eq, eqIdx) => {
                            const isNewEquipment = isEquipmentNew(service, eq);
                            
                            return (
                              <View key={eqIdx} style={[styles.equipmentListItem, isNewEquipment && styles.newEquipmentItem]}>
                                <View style={styles.equipmentItemLeft}>
                                  <View style={{ flex: 1 }}>
                                    <View style={styles.equipmentNameRow}>
                                      <Text style={styles.equipmentItemName}>{eq.name}</Text>
                                      {isNewEquipment && (
                                        <View style={styles.equipmentNewBadge}>
                                          <Text style={styles.equipmentNewBadgeText}>NEW</Text>
                                        </View>
                                      )}
                                    </View>
                                    <Text style={styles.equipmentItemModel}>Model: {eq.model || '-'}</Text>
                                    {eq.status === 'C' && eq.parts && eq.parts.length > 0 && (
                                      <View style={styles.partsSummary}>
                                        <Ionicons name="cube-outline" size={10} color="#666" />
                                        <Text style={styles.partsSummaryText}>{eq.parts.length} part(s) used</Text>
                                      </View>
                                    )}
                                  </View>
                                </View>
                                {eq.status !== 'C' && (
                                  <TouchableOpacity style={styles.updateSmallBtn} onPress={() => openUpdateService(service, eq)}>
                                    <Ionicons name="create-outline" size={10} color="#fff" />
                                    <Text style={styles.updateSmallBtnText}>Update</Text>
                                  </TouchableOpacity>
                                )}
                                {eq.status === 'C' && (
                                  <View style={styles.completedBadgeSmall}>
                                    <Ionicons name="checkmark-circle" size={10} color="#EF4444" />
                                    <Text style={styles.completedBadgeSmallText}>Done</Text>
                                  </View>
                                )}
                              </View>
                            );
                          })}
                        </View>

                        {!allCompleted && displayEquipment.length > 0 && (
                          <View style={styles.footerLocked}>
                            <Ionicons name="lock-closed-outline" size={10} color="#bbb" />
                            <Text style={styles.footerLockedText}>Complete all equipment</Text>
                          </View>
                        )}

                        {allCompleted && (
                          <TouchableOpacity style={styles.viewDetailsBtn} onPress={() => openPlantDetails(service)}>
                            <Text style={styles.viewDetailsBtnText}>View Details</Text>
                            <Ionicons name="document-text-outline" size={14} color="#1976d2" />
                          </TouchableOpacity>
                        )}
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          );
        }}
      />

      {/* ✅ STATUS MODAL - Clean, small cards, button ku kela */}
      <Modal
        visible={showStatusModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowStatusModal(false)}
      >
        <TouchableOpacity 
          style={styles.statusModalOverlay} 
          activeOpacity={1} 
          onPress={() => setShowStatusModal(false)}
        >
          <View style={styles.statusModalContainer}>
            <View style={styles.statusModalHeader}>
              <Text style={styles.statusModalTitle}>Service Status</Text>
              <TouchableOpacity onPress={() => setShowStatusModal(false)}>
                <Ionicons name="close" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>
            
            {/* Horizontal ScrollView - Small cards */}
            <ScrollView 
              horizontal={true} 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.statusModalContent}
              decelerationRate="fast"
            >
              {/* Total Card */}
              <TouchableOpacity style={styles.statusCard} onPress={() => {
                setShowStatusModal(false);
                setSelectedStatus('all');
              }}>
                <View style={[styles.statusIconCircle, { backgroundColor: '#1976d2' }]}>
                  <Ionicons name="document-text-outline" size={22} color="#fff" />
                </View>
                <Text style={styles.statusCount}>{getStatusCountsWithColors().total}</Text>
                <Text style={styles.statusLabel}>Total</Text>
              </TouchableOpacity>
              
              {/* Assigned Card - Orange */}
              <TouchableOpacity style={styles.statusCard} onPress={() => {
                setShowStatusModal(false);
                setSelectedStatus('assigned');
              }}>
                <View style={[styles.statusIconCircle, { backgroundColor: '#FF9800' }]}>
                  <Ionicons name="time-outline" size={22} color="#fff" />
                </View>
                <Text style={[styles.statusCount, { color: '#FF9800' }]}>{getStatusCountsWithColors().assigned}</Text>
                <Text style={styles.statusLabel}>Assigned</Text>
              </TouchableOpacity>
              
              {/* In Progress Card - Green */}
              <TouchableOpacity style={styles.statusCard} onPress={() => {
                setShowStatusModal(false);
                setSelectedStatus('pending');
              }}>
                <View style={[styles.statusIconCircle, { backgroundColor: '#4CAF50' }]}>
                  <Ionicons name="refresh-circle-outline" size={22} color="#fff" />
                </View>
                <Text style={[styles.statusCount, { color: '#4CAF50' }]}>{getStatusCountsWithColors().pending}</Text>
                <Text style={styles.statusLabel}>Progress</Text>
              </TouchableOpacity>
              
              {/* Completed Card - Red */}
              <TouchableOpacity style={styles.statusCard} onPress={() => {
                setShowStatusModal(false);
                setSelectedStatus('completed');
              }}>
                <View style={[styles.statusIconCircle, { backgroundColor: '#EF4444' }]}>
                  <Ionicons name="checkmark-done-circle-outline" size={22} color="#fff" />
                </View>
                <Text style={[styles.statusCount, { color: '#EF4444' }]}>{getStatusCountsWithColors().completed}</Text>
                <Text style={styles.statusLabel}>Completed</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* View Details Modal */}
      <Modal animationType="slide" transparent={true} visible={viewDetailsModal} onRequestClose={() => setViewDetailsModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Service Details</Text>
              <TouchableOpacity onPress={() => setViewDetailsModal(false)}><Ionicons name="close" size={24} color="#333" /></TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {viewingPlant && (
                <View>
                  <View style={styles.modalInfoCard}>
                    <Text style={styles.modalPlantName}>{viewingPlant.plant}</Text>
                    <Text style={styles.modalSRID}>SR-{viewingPlant.id}</Text>
                    <Text style={styles.modalDate}>Request: {viewingPlant.date}</Text>
                    {getLatestCompletionDate(viewingPlant.equipmentList) && (
                      <Text style={styles.modalServicedDate}>Completed: {getLatestCompletionDate(viewingPlant.equipmentList)}</Text>
                    )}
                  </View>
                  <Text style={styles.modalSubtitle}>Equipment Details</Text>
                  {viewingPlant.equipmentList?.map((eq, idx) => (
                    <View key={idx} style={styles.modalEquipmentCard}>
                      <View style={styles.modalEquipmentHeader}>
                        <Text style={styles.modalEquipmentName}>{eq.name}</Text>
                        <Text style={[styles.modalEquipmentStatus, { color: eq.status === 'C' ? '#EF4444' : (eq.status === 'A' ? '#FF9800' : '#4CAF50') }]}>
                          {eq.status === 'C' ? 'Completed' : (eq.status === 'A' ? 'Assigned' : 'In Progress')}
                        </Text>
                      </View>
                      <View style={styles.modalDetailRow}>
                        <Text style={styles.modalDetailLabel}>Model:</Text>
                        <Text style={styles.modalDetailValue}>{eq.model || '-'}</Text>
                      </View>
                      {eq.status === 'C' && (
                        <>
                          <View style={styles.modalDetailRow}>
                            <Text style={styles.modalDetailLabel}>Service Date:</Text>
                            <Text style={styles.modalDetailValue}>{eq.serviceDate || '-'}</Text>
                          </View>
                          <View style={styles.modalDetailRow}>
                            <Text style={styles.modalDetailLabel}>Service Type:</Text>
                            <Text style={styles.modalDetailValue}>{eq.serviceTypeName || '-'}</Text>
                          </View>
                          {eq.remarks && eq.remarks !== '-' && (
                            <View style={styles.modalDetailRow}>
                              <Text style={styles.modalDetailLabel}>Remarks:</Text>
                              <Text style={styles.modalDetailValue}>{eq.remarks}</Text>
                            </View>
                          )}
                          {eq.parts && eq.parts.length > 0 && (
                            <View style={styles.modalPartsSection}>
                              <Text style={styles.modalPartsTitle}>Parts Used ({eq.parts.length})</Text>
                              {eq.parts.map((part, pIdx) => (
                                <View key={pIdx} style={styles.modalPartRow}>
                                  <Text style={styles.modalPartName}>{part.partName}</Text>
                                  <Text style={styles.modalPartDetail}>
                                    {part.qty} × ₹{part.rate}
                                  </Text>
                                </View>
                              ))}
                            </View>
                          )}
                        </>
                      )}
                      {eq.status !== 'C' && (
                        <TouchableOpacity 
                          style={styles.updateButton}
                          onPress={() => {
                            setViewDetailsModal(false);
                            openUpdateService(viewingPlant, eq);
                          }}
                        >
                          <Text style={styles.updateButtonText}>Update Service</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>
            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setViewDetailsModal(false)}>
              <Text style={styles.modalCloseBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal animationType="slide" transparent={false} visible={updateModalVisible} onRequestClose={() => setUpdateModalVisible(false)}>
        {updateData && <UpdateServiceScreen data={updateData.service} equipment={updateData.equipment} onClose={() => setUpdateModalVisible(false)} onComplete={handleServiceUpdateComplete} />}
      </Modal>
    </View>
  );
}

// UpdateServiceScreen Component (keep as is)
function UpdateServiceScreen({ data, equipment, onClose, onComplete }) {
  const [remarks, setRemarks] = useState('');
  const [selectedParts, setSelectedParts] = useState([]);
  const [availableParts, setAvailableParts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [selectedServiceType, setSelectedServiceType] = useState(null);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [serviceTypes, setServiceTypes] = useState([]);
  const [loadingParts, setLoadingParts] = useState(false);
  const [showServiceTypeDropdown, setShowServiceTypeDropdown] = useState(false);
  const [showPartsDropdown, setShowPartsDropdown] = useState(false);
  const [selectedPartForAdd, setSelectedPartForAdd] = useState(null);
  const [partQuantity, setPartQuantity] = useState(1);

  useEffect(() => { initializeData(); }, []);

  const initializeData = async () => {
    setInitialLoading(true);
    await fetchServiceTypes();
    if (equipment.categoryId) await fetchPartsByCategory(equipment.categoryId);
    else Alert.alert('Error', 'Equipment category not found');
    setRemarks(equipment.remarks !== '-' && equipment.remarks ? equipment.remarks : '');
    setSelectedParts(equipment.parts || []);
    if (equipment.serviceTypeId) setSelectedServiceType(equipment.serviceTypeId);
    setInitialLoading(false);
  };

  const fetchServiceTypes = async () => {
    try {
      const response = await axios.get(`${API_BASE}/service-types`);
      let serviceTypesData = Array.isArray(response.data) ? response.data : (response.data?.data || []);
      const formattedTypes = serviceTypesData.map(type => ({
        id: type.id?.toString() || type.ServiceTypeID?.toString(),
        name: type.name || type.ServiceTypeName,
        rate: type.rate || type.Rate || 0,
        unit: type.unit || type.UnitOfMeasure || 'SERV'
      }));
      setServiceTypes(formattedTypes);
    } catch (error) { setServiceTypes([]); }
  };

  const fetchPartsByCategory = async (categoryId) => {
    try {
      setLoadingParts(true);
      const response = await axios.get(`${API_BASE}/parts/${categoryId}`);
      let partsData = Array.isArray(response.data) ? response.data : (response.data?.data || []);
      const formattedParts = partsData.map(part => ({
        partId: part.partId || part.PartID,
        partName: part.partName || part.PartName,
        rate: part.rate || part.Rate || 0,
        unit: part.unit || part.Unit || 'Nos'
      }));
      setAvailableParts(formattedParts);
    } catch (error) { setAvailableParts([]); }
    finally { setLoadingParts(false); }
  };

  const pickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: "*/*", copyToCacheDirectory: true });
      if (result.assets && result.assets.length > 0) {
        const selectedFile = result.assets[0];
        if (selectedFile.size && selectedFile.size > 50 * 1024 * 1024) { Alert.alert("File Too Large", "File size exceeds 50MB limit"); return; }
        setFile({ uri: selectedFile.uri, name: selectedFile.name, mimeType: selectedFile.mimeType, size: selectedFile.size });
      }
    } catch (e) { console.log(e); }
  };

  const uploadFile = async () => {
    if (!file) return "";
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', { uri: file.uri, type: file.mimeType || 'application/octet-stream', name: file.name });
      const response = await axios.post(`${API_BASE}/uploadFile`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      return response.data.status === "success" ? response.data.fileName : "";
    } catch (error) { return ""; }
    finally { setUploading(false); }
  };

  const addPart = () => {
    if (!selectedPartForAdd) { Alert.alert('Select Part', 'Please select a part first'); return; }
    if (selectedParts.some(p => p.partId === selectedPartForAdd.partId)) { Alert.alert('Part Already Added', 'This part is already in the list'); return; }
    setSelectedParts([...selectedParts, { partId: selectedPartForAdd.partId, partName: selectedPartForAdd.partName, qty: partQuantity, rate: selectedPartForAdd.rate, unit: selectedPartForAdd.unit }]);
    setSelectedPartForAdd(null);
    setPartQuantity(1);
    setShowPartsDropdown(false);
  };

  const removePart = (partId) => {
    Alert.alert('Remove Part', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => setSelectedParts(selectedParts.filter(p => p.partId !== partId)) }
    ]);
  };

  const updateQuantity = (partId, delta) => {
    setSelectedParts(selectedParts.map(p => p.partId === partId ? { ...p, qty: Math.max(1, p.qty + delta) } : p));
  };

  const handleSubmit = async () => {
    if (!selectedServiceType) { Alert.alert('Required', 'Please select a service type'); return; }
    if (selectedParts.length === 0) { Alert.alert('Required', 'Please add at least one part'); return; }
    setLoading(true);
    try {
      let uploadedFile = await uploadFile();
      const selectedType = serviceTypes.find(t => t.id === selectedServiceType);
      const payload = {
        srid: data.id,
        equipmentId: equipment.id,
        remarks: remarks || '-',
        status: 'C',
        serviceTypeId: selectedServiceType,
        serviceRate: selectedType?.rate || 0,
        file: uploadedFile,
        parts: selectedParts.map(p => ({ partId: p.partId, qty: p.qty }))
      };
      const response = await axios.post(`${API_BASE}/updateService`, payload);
      if (response.data.status === 'success') {
        Alert.alert('Success', 'Service completed successfully!');
        onComplete();
        onClose();
      } else Alert.alert('Error', response.data.message || 'Update failed');
    } catch (error) { Alert.alert('Error', 'Failed to update service'); }
    finally { setLoading(false); }
  };

  const getTotalAmount = () => {
    const partsTotal = selectedParts.reduce((sum, p) => sum + (p.rate * p.qty), 0);
    const selectedType = serviceTypes.find(t => t.id === selectedServiceType);
    return partsTotal + (selectedType?.rate || 0);
  };

  const getSelectedServiceTypeName = () => {
    const selected = serviceTypes.find(t => t.id === selectedServiceType);
    return selected ? selected.name : 'Select Service Type';
  };

  if (initialLoading) {
    return (
      <View style={styles.updateLoadingContainer}>
        <ActivityIndicator size="large" color="#1976d2" />
        <Text style={styles.updateLoadingText}>Loading service data...</Text>
      </View>
    );
  }

  return (
    <View style={styles.updateContainer}>
      <View style={styles.updateHeader}>
        <TouchableOpacity onPress={onClose} style={styles.updateBackBtn}><Ionicons name="arrow-back" size={24} color="#1976d2" /></TouchableOpacity>
        <Text style={styles.updateHeaderTitle}>Complete Service</Text>
        <View style={styles.headerPlaceholder} />
      </View>
      <ScrollView style={styles.updateContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.updateInfoCard}>
          <View style={styles.updateInfoRow}><Ionicons name="business-outline" size={20} color="#1976d2" /><View><Text style={styles.updateInfoLabel}>PLANT</Text><Text style={styles.updateInfoValue}>{data.plant}</Text></View></View>
          <View style={styles.updateInfoRow}><Ionicons name="hardware-chip-outline" size={20} color="#1976d2" /><View><Text style={styles.updateInfoLabel}>EQUIPMENT</Text><Text style={styles.updateInfoValue}>{equipment.name}</Text><Text style={styles.updateInfoSub}>Model: {equipment.model || 'N/A'}</Text></View></View>
        </View>
        <View style={styles.updateSection}>
          <Text style={styles.updateSectionTitle}>Service Type *</Text>
          <TouchableOpacity style={styles.professionalDropdown} onPress={() => setShowServiceTypeDropdown(!showServiceTypeDropdown)}>
            <Text style={[styles.professionalDropdownText, !selectedServiceType && styles.placeholderText]}>{getSelectedServiceTypeName()}</Text>
            <Ionicons name={showServiceTypeDropdown ? "chevron-up" : "chevron-down"} size={20} color="#1976d2" />
          </TouchableOpacity>
          {showServiceTypeDropdown && (
            <View style={styles.professionalDropdownList}>
              <ScrollView style={{ maxHeight: 250 }} nestedScrollEnabled={true}>
                {serviceTypes.map(type => (
                  <TouchableOpacity key={type.id} style={[styles.professionalDropdownItem, selectedServiceType === type.id && styles.professionalDropdownItemSelected]} onPress={() => { setSelectedServiceType(type.id); setShowServiceTypeDropdown(false); }}>
                    <View><Text style={styles.dropdownItemTitle}>{type.name}</Text><Text style={styles.dropdownItemSubtitle}>₹{type.rate} / {type.unit}</Text></View>
                    {selectedServiceType === type.id && <Ionicons name="checkmark-circle" size={20} color="#2e7d32" />}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>
        <View style={styles.updateSection}>
          <Text style={styles.updateSectionTitle}>Parts Used *</Text>
          <TouchableOpacity style={styles.professionalDropdown} onPress={() => setShowPartsDropdown(!showPartsDropdown)}>
            <Text style={styles.professionalDropdownText}>{selectedPartForAdd ? selectedPartForAdd.partName : 'Select Part'}</Text>
            <Ionicons name={showPartsDropdown ? "chevron-up" : "chevron-down"} size={20} color="#1976d2" />
          </TouchableOpacity>
          {showPartsDropdown && (
            <View style={styles.professionalDropdownList}>
              <ScrollView style={{ maxHeight: 250 }} nestedScrollEnabled={true}>
                {loadingParts ? <View style={styles.dropdownLoadingItem}><ActivityIndicator size="small" color="#1976d2" /><Text style={styles.dropdownLoadingText}>Loading parts...</Text></View> :
                 availableParts.length === 0 ? <View style={styles.dropdownEmptyItem}><Text style={styles.dropdownEmptyText}>No parts available</Text></View> :
                 availableParts.map(part => (
                  <TouchableOpacity key={part.partId} style={[styles.professionalDropdownItem, selectedPartForAdd?.partId === part.partId && styles.professionalDropdownItemSelected]} onPress={() => { setSelectedPartForAdd(part); setShowPartsDropdown(false); }}>
                    <View><Text style={styles.dropdownItemTitle}>{part.partName}</Text><Text style={styles.dropdownItemSubtitle}>₹{part.rate} / {part.unit}</Text></View>
                    {selectedPartForAdd?.partId === part.partId && <Ionicons name="checkmark-circle" size={20} color="#2e7d32" />}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
          {selectedPartForAdd && (
            <View style={styles.quantityAddContainer}>
              <View style={styles.quantityControl}><Text style={styles.quantityLabel}>Quantity:</Text><View style={styles.quantityButtons}>
                <TouchableOpacity onPress={() => setPartQuantity(Math.max(1, partQuantity - 1))}><Ionicons name="remove-circle-outline" size={24} color="#d32f2f" /></TouchableOpacity>
                <Text style={styles.quantityValue}>{partQuantity}</Text>
                <TouchableOpacity onPress={() => setPartQuantity(partQuantity + 1)}><Ionicons name="add-circle-outline" size={24} color="#2e7d32" /></TouchableOpacity>
              </View></View>
              <TouchableOpacity style={styles.addPartButton} onPress={addPart}><Ionicons name="add-circle-outline" size={18} color="#fff" /><Text style={styles.addPartButtonText}>Add Part</Text></TouchableOpacity>
            </View>
          )}
        </View>
        {selectedParts.length > 0 && (
          <View style={styles.updateSection}>
            <Text style={styles.updateSectionTitle}>Added Parts</Text>
            {selectedParts.map((part, idx) => (
              <View key={idx} style={styles.selectedPartCard}>
                <View><Text style={styles.selectedPartName}>{part.partName}</Text><Text style={styles.selectedPartPrice}>₹{part.rate} × {part.qty} = ₹{part.rate * part.qty}</Text></View>
                <View style={styles.selectedPartActions}>
                  <TouchableOpacity onPress={() => updateQuantity(part.partId, -1)}><Ionicons name="remove-circle-outline" size={24} color="#d32f2f" /></TouchableOpacity>
                  <Text style={styles.selectedPartQty}>{part.qty}</Text>
                  <TouchableOpacity onPress={() => updateQuantity(part.partId, 1)}><Ionicons name="add-circle-outline" size={24} color="#2e7d32" /></TouchableOpacity>
                  <TouchableOpacity onPress={() => removePart(part.partId)}><Ionicons name="trash-outline" size={22} color="#d32f2f" /></TouchableOpacity>
                </View>
              </View>
            ))}
            <View style={styles.totalAmountContainer}><Text style={styles.totalAmountLabel}>Total Amount:</Text><Text style={styles.totalAmountValue}>₹{getTotalAmount()}</Text></View>
          </View>
        )}
        <View style={styles.updateSection}>
          <Text style={styles.updateSectionTitle}>Remarks</Text>
          <TextInput style={styles.remarksInput} value={remarks} onChangeText={setRemarks} multiline numberOfLines={3} placeholder="Add work details..." textAlignVertical="top" />
        </View>
        <View style={styles.updateSection}>
          <Text style={styles.updateSectionTitle}>Attach File</Text>
          <TouchableOpacity style={styles.fileButton} onPress={pickFile}><Ionicons name="cloud-upload-outline" size={22} color="#1976d2" /><Text style={styles.fileButtonText}>{file ? file.name : "Upload File (Max 50MB)"}</Text></TouchableOpacity>
          {file && <View style={styles.fileInfo}><Text style={styles.fileSize}>{(file.size / (1024 * 1024)).toFixed(2)} MB</Text><TouchableOpacity onPress={() => setFile(null)} style={styles.removeFileBtn}><Ionicons name="close-circle" size={16} color="#d32f2f" /><Text style={styles.removeFileText}>Remove</Text></TouchableOpacity></View>}
        </View>
        <View style={{ height: 20 }} />
      </ScrollView>
      <View style={styles.bottomButtonContainer}>
        <TouchableOpacity style={[styles.completeBtn, (loading || !selectedServiceType || selectedParts.length === 0) && styles.completeBtnDisabled]} onPress={handleSubmit} disabled={loading || !selectedServiceType || selectedParts.length === 0}>
          {loading || uploading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.completeBtnText}>Complete Service</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fa' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f7fa' },
  loadingText: { marginTop: 12, fontSize: 14, color: '#666' },
  updateLoadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  updateLoadingText: { marginTop: 12, fontSize: 14, color: '#666' },
  
  header: { backgroundColor: '#1976d2', paddingTop: 12, paddingBottom: 16, paddingHorizontal: 16, borderBottomLeftRadius: 20, borderBottomRightRadius: 20, zIndex: 5 },
  headerTop: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center' },
  headerLeft: { width: 24 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  notificationIcon: { position: 'relative', padding: 4 },
  notificationBadge: { position: 'absolute', top: -2, right: -4, backgroundColor: '#FF4444', borderRadius: 10, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  notificationBadgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  
  // ✅ STATUS MODAL STYLES - Button ku kela (top), small cards
  statusModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-start', alignItems: 'center', paddingTop: 70 },
  statusModalContainer: { backgroundColor: '#fff', borderRadius: 16, width: width * 0.92, maxHeight: height * 0.35, overflow: 'hidden' },
  statusModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  statusModalTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  statusModalContent: { paddingHorizontal: 12, paddingVertical: 16, flexDirection: 'row', gap: 12 },
  statusCard: { 
    backgroundColor: '#fff', 
    borderRadius: 12, 
    padding: 12, 
    width: width * 0.2,
    minWidth: 70,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e8e8e8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1
  },
  statusIconCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  statusInfo: { alignItems: 'center' },
  statusCount: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  statusLabel: { fontSize: 11, fontWeight: '500', color: '#666', marginTop: 4 },
  statusSubLabel: { fontSize: 9, color: '#999', marginTop: 2, textAlign: 'center' },
  
  notificationOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999, backgroundColor: 'transparent' },
  notificationDropdown: { position: 'absolute', top: 60, right: 16, backgroundColor: '#fff', borderRadius: 12, elevation: 10, minWidth: 220, maxWidth: 280, zIndex: 1000, borderWidth: 1, borderColor: '#e0e0e0', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  notificationDropdownHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  notificationDropdownTitle: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  clearAllText: { fontSize: 11, color: '#1976d2' },
  notificationDropdownItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  notificationDropdownItemRead: { backgroundColor: '#f9f9f9' },
  notificationDot: { width: 20, alignItems: 'center' },
  unreadDotSmall: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#1976d2' },
  notificationDropdownMessage: { flex: 1, fontSize: 12, color: '#333' },
  notificationDropdownMessageRead: { color: '#999' },
  noNotificationsDropdown: { padding: 20, alignItems: 'center' },
  noNotificationsText: { fontSize: 12, color: '#999' },
  
  filterRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 12, gap: 8, zIndex: 10, backgroundColor: '#f5f7fa' },
  filterDropdownContainer: { position: 'relative', zIndex: 1002 },
  filterBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#e0e0e0', gap: 6 },
  filterBtnActive: { backgroundColor: '#1976d2', borderColor: '#1976d2' },
  filterBtnText: { fontSize: 12, color: '#1976d2', fontWeight: '500', maxWidth: 150 },
  filterBtnTextActive: { color: '#fff' },
  filterDropdownMenu: { position: 'absolute', top: 42, left: 0, backgroundColor: '#fff', borderRadius: 10, elevation: 10, minWidth: 200, maxHeight: 350, zIndex: 1003, borderWidth: 1, borderColor: '#e0e0e0', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  filterOption: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, gap: 10 },
  filterOptionActive: { backgroundColor: '#E3F2FD' },
  filterOptionText: { fontSize: 13, color: '#333' },
  filterOptionTextActive: { color: '#1976d2', fontWeight: '500' },
  filterOptionClear: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, gap: 10, backgroundColor: '#FFEBEE' },
  filterOptionClearText: { fontSize: 13, color: '#d32f2f', fontWeight: '500' },
  filterDivider: { height: 1, backgroundColor: '#f0f0f0' },
  
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#e0e0e0', gap: 8 },
  searchInput: { flex: 1, fontSize: 13, color: '#333', padding: 0 },
  
  statusDropdownContainer: { position: 'relative', zIndex: 1001 },
  statusBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#e0e0e0', gap: 6 },
  statusBtnText: { fontSize: 12, color: '#1976d2', fontWeight: '500' },
  statusDropdownMenu: { position: 'absolute', top: 42, right: 0, backgroundColor: '#fff', borderRadius: 10, elevation: 10, minWidth: 140, zIndex: 1002, borderWidth: 1, borderColor: '#e0e0e0', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  statusOption: { paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  statusOptionActive: { backgroundColor: '#E3F2FD' },
  statusOptionText: { fontSize: 13, color: '#333' },
  
  listContent: { paddingHorizontal: 12, paddingBottom: 20, paddingTop: 8 },
  emptyContainer: { alignItems: 'center', padding: 60 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#4CAF50', marginTop: 16 },
  emptyText: { marginTop: 8, color: '#999', fontSize: 14 },
  
  treeviewContainer: { marginBottom: 10, backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden', elevation: 2, borderWidth: 1, borderColor: '#e8e8e8' },
  treeviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, backgroundColor: '#fff' },
  newPlantHeader: { backgroundColor: '#E8F5E9' },
  treeviewLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  treeviewPlantName: { fontSize: 16, fontWeight: '600', color: '#1a237e' },
  plantNewBadge: { backgroundColor: '#4CAF50', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, alignSelf: 'flex-start', marginTop: 2 },
  plantNewBadgeText: { color: '#fff', fontSize: 9, fontWeight: 'bold' },
  treeviewLastServiced: { fontSize: 11, color: '#4CAF50', marginTop: 4 },
  treeviewRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  treeviewBadgeText: { fontSize: 12, fontWeight: '500' },
  treeviewCount: { fontSize: 12, fontWeight: '600', color: '#666', minWidth: 40, textAlign: 'right' },
  treeviewContent: { padding: 12, paddingTop: 0, backgroundColor: '#f8fafc', borderTopWidth: 1, borderTopColor: '#eef2f6' },
  treeviewStats: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, paddingVertical: 10, marginBottom: 8, borderBottomWidth: 1, borderBottomColor: '#eef2f6' },
  treeviewStat: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  treeviewStatText: { fontSize: 11, color: '#666' },
  treeviewServiceItem: { backgroundColor: '#fff', borderRadius: 10, marginBottom: 10, padding: 12, borderWidth: 1, borderColor: '#f0f0f0', position: 'relative' },
  newServiceItem: { borderColor: '#4CAF50', borderWidth: 2, backgroundColor: '#E8F5E9' },
  newBadge: { position: 'absolute', top: -6, left: -6, backgroundColor: '#4CAF50', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10, zIndex: 10 },
  newBadgeText: { color: '#fff', fontSize: 8, fontWeight: 'bold' },
  
  serviceItemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  serviceIdContainer: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  serviceId: { fontSize: 12, fontWeight: '600', color: '#1976d2' },
  serviceStatusText: { fontSize: 11, fontWeight: '600' },
  serviceDateRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  serviceDate: { fontSize: 10, color: '#666' },
  
  equipmentListContainer: { marginTop: 8 },
  equipmentListTitle: { fontSize: 11, fontWeight: '600', color: '#666', marginBottom: 6 },
  equipmentListItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f8fafc', padding: 8, borderRadius: 6, marginBottom: 6 },
  newEquipmentItem: { backgroundColor: '#E8F5E9', borderLeftWidth: 3, borderLeftColor: '#4CAF50' },
  equipmentNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  equipmentItemName: { fontSize: 11, fontWeight: '500', color: '#333' },
  equipmentNewBadge: { backgroundColor: '#4CAF50', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  equipmentNewBadgeText: { fontSize: 8, color: '#fff', fontWeight: 'bold' },
  equipmentItemModel: { fontSize: 9, color: '#999', marginTop: 2 },
  equipmentItemLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  partsSummary: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  partsSummaryText: { fontSize: 9, color: '#666' },
  updateSmallBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1976d2', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 5, gap: 5 },
  updateSmallBtnText: { color: '#fff', fontSize: 9, fontWeight: '500' },
  completedBadgeSmall: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#FFEBEE', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  completedBadgeSmallText: { fontSize: 9, color: '#EF4444', fontWeight: '500' },
  
  footerLocked: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 8, paddingTop: 6, borderTopWidth: 1, borderTopColor: '#f0f0f0', gap: 5 },
  footerLockedText: { fontSize: 9, color: '#bbb' },
  viewDetailsBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 8, paddingTop: 6, borderTopWidth: 1, borderTopColor: '#f0f0f0', gap: 5 },
  viewDetailsBtnText: { fontSize: 10, color: '#1976d2', fontWeight: '500' },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContainer: { backgroundColor: '#fff', borderRadius: 20, width: width * 0.92, maxHeight: height * 0.85, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#e8e8e8' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1a237e' },
  modalInfoCard: { marginBottom: 16 },
  modalPlantName: { fontSize: 20, fontWeight: 'bold', color: '#1a237e', marginBottom: 16, paddingBottom: 8, borderBottomWidth: 2, borderBottomColor: '#1976d2', alignSelf: 'flex-start' },
  modalSRID: { fontSize: 13, color: '#1976d2', fontWeight: '500', marginBottom: 8 },
  modalDate: { fontSize: 13, color: '#666', marginBottom: 6 },
  modalServicedDate: { fontSize: 13, color: '#4caf50', fontWeight: '500', marginBottom: 6 },
  modalSubtitle: { fontSize: 16, fontWeight: 'bold', color: '#1976d2', marginTop: 20, marginBottom: 15, paddingBottom: 5, borderBottomWidth: 1, borderBottomColor: '#e0e0e0' },
  modalEquipmentCard: { backgroundColor: '#f8fafc', borderRadius: 14, padding: 15, marginBottom: 15, borderWidth: 1, borderColor: '#eef2f6' },
  modalEquipmentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#e0e0e0' },
  modalEquipmentName: { fontSize: 16, fontWeight: 'bold', color: '#1a237e', flex: 1 },
  modalEquipmentStatus: { fontSize: 12, fontWeight: '600' },
  modalDetailRow: { flexDirection: 'row', marginBottom: 8, alignItems: 'center' },
  modalDetailLabel: { fontSize: 12, color: '#888', width: 95, fontWeight: '500' },
  modalDetailValue: { fontSize: 12, color: '#333', flex: 1, fontWeight: '500' },
  modalPartsSection: { marginTop: 12, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#e0e0e0' },
  modalPartsTitle: { fontSize: 13, fontWeight: 'bold', color: '#1976d2', marginBottom: 10 },
  modalPartRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, paddingLeft: 8 },
  modalPartName: { fontSize: 12, color: '#555', flex: 1 },
  modalPartDetail: { fontSize: 12, color: '#1976d2', fontWeight: '600' },
  updateButton: { marginTop: 12, backgroundColor: '#1976d2', paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  updateButtonText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  modalCloseBtn: { marginTop: 20, backgroundColor: '#1976d2', padding: 14, borderRadius: 12, alignItems: 'center' },
  modalCloseBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  
  updateContainer: { flex: 1, backgroundColor: '#f8f9fa' },
  updateHeader: { backgroundColor: '#fff', paddingTop: 48, paddingBottom: 16, paddingHorizontal: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#e0e0e0' },
  updateBackBtn: { padding: 4 },
  updateHeaderTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  headerPlaceholder: { width: 32 },
  updateContent: { flex: 1, padding: 16 },
  updateInfoCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e0e0e0' },
  updateInfoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  updateInfoLabel: { fontSize: 10, color: '#666', marginBottom: 2, textTransform: 'uppercase' },
  updateInfoValue: { fontSize: 14, fontWeight: '500', color: '#333' },
  updateInfoSub: { fontSize: 11, color: '#666', marginTop: 2 },
  updateSection: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e0e0e0' },
  updateSectionTitle: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 12 },
  professionalDropdown: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8f9fa', paddingHorizontal: 14, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: '#e0e0e0' },
  professionalDropdownText: { fontSize: 14, color: '#333', flex: 1 },
  placeholderText: { color: '#999' },
  professionalDropdownList: { marginTop: 8, backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#e0e0e0', overflow: 'hidden', zIndex: 1000 },
  professionalDropdownItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  professionalDropdownItemSelected: { backgroundColor: '#e8f0fe' },
  dropdownItemTitle: { fontSize: 14, fontWeight: '500', color: '#333' },
  dropdownItemSubtitle: { fontSize: 12, color: '#666', marginTop: 2 },
  dropdownEmptyItem: { padding: 20, alignItems: 'center' },
  dropdownEmptyText: { fontSize: 13, color: '#999' },
  dropdownLoadingItem: { padding: 20, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 10 },
  dropdownLoadingText: { fontSize: 13, color: '#666' },
  quantityAddContainer: { marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 },
  quantityControl: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  quantityLabel: { fontSize: 13, color: '#666', fontWeight: '500' },
  quantityButtons: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  quantityValue: { fontSize: 16, fontWeight: '600', color: '#333', minWidth: 30, textAlign: 'center' },
  addPartButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#2e7d32', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, gap: 6 },
  addPartButtonText: { color: '#fff', fontSize: 13, fontWeight: '500' },
  selectedPartCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8f9fa', padding: 12, borderRadius: 10, marginBottom: 8 },
  selectedPartName: { fontSize: 14, fontWeight: '500', color: '#333' },
  selectedPartPrice: { fontSize: 11, color: '#666', marginTop: 2 },
  selectedPartActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  selectedPartQty: { fontSize: 15, fontWeight: '600', color: '#333', minWidth: 25, textAlign: 'center' },
  totalAmountContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#e0e0e0' },
  totalAmountLabel: { fontSize: 14, fontWeight: '600', color: '#666' },
  totalAmountValue: { fontSize: 18, fontWeight: 'bold', color: '#2e7d32' },
  remarksInput: { backgroundColor: '#f8f9fa', borderRadius: 10, padding: 12, minHeight: 80, fontSize: 13, color: '#333', borderWidth: 1, borderColor: '#e0e0e0', textAlignVertical: 'top' },
  fileButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#e8f0fe', padding: 14, borderRadius: 10, gap: 10 },
  fileButtonText: { fontSize: 13, color: '#1976d2', flex: 1 },
  fileInfo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  fileSize: { fontSize: 11, color: '#888' },
  removeFileBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  removeFileText: { fontSize: 11, color: '#d32f2f' },
  bottomButtonContainer: { padding: 16, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e0e0e0' },
  completeBtn: { backgroundColor: '#2e7d32', paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  completeBtnDisabled: { opacity: 0.6 },
  completeBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});

export { UpdateServiceScreen };