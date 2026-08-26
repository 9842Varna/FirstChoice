import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  ScrollView,
  Alert,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import * as WebBrowser from 'expo-web-browser';
import CreateServiceScreen from './CreateServiceScreen';

const API_BASE = 'http://192.168.29.223:2927/api';

//const API_BASE = 'http://10.196.32.8:2927/api';

const formatNumber = (num) => {
  if (num === undefined || num === null) return '₹0';
  let amount = parseFloat(num);
  if (isNaN(amount)) return '₹0';
  let str = Math.round(amount).toString();
  let lastThree = str.slice(-3);
  let otherNumbers = str.slice(0, -3);
  if (otherNumbers !== '') {
    lastThree = ',' + lastThree;
  }
  let result = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + lastThree;
  return `₹${result}`;
};

export default function AdminHomeScreen({ user }) {
  const [services, setServices] = useState([]);
  const [filteredServices, setFilteredServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAssignSheet, setShowAssignSheet] = useState(false);
  const [showHistorySheet, setShowHistorySheet] = useState(false);
  const [showConfirmAssign, setShowConfirmAssign] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [serviceDetails, setServiceDetails] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [selectedEquipment, setSelectedEquipment] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [assigning, setAssigning] = useState(false);
  const [openingFile, setOpeningFile] = useState(null);
  const [isOpeningFile, setIsOpeningFile] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  
  const [employeePendingServices, setEmployeePendingServices] = useState({});
  const [loadingPending, setLoadingPending] = useState({});
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [sortType, setSortType] = useState('srid');
  const [sortOrder, setSortOrder] = useState('desc');

  useEffect(() => {
    loadServices();
  }, []);

  useEffect(() => {
    filterAndSortServices();
  }, [services, searchQuery, filterStatus, sortType, sortOrder]);

  const loadServices = async () => {
    try {
      const response = await axios.get(`${API_BASE}/admin/services/all`);
      if (response.data.status === 'success') {
        setServices(response.data.services || []);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load services');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadServices();
    setRefreshing(false);
  };

  const handleSort = (type) => {
    if (sortType === type) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortType(type);
      setSortOrder('asc');
    }
    setShowSortDropdown(false);
  };

  const getSortArrow = () => {
    return sortOrder === 'asc' ? '↑' : '↓';
  };

  const getSortLabel = () => {
    const arrow = getSortArrow();
    switch (sortType) {
      case 'srid': return `SR ID ${arrow}`;
      case 'date': return `Date ${arrow}`;
      case 'plant': return `Plant ${arrow}`;
      default: return 'Sort';
    }
  };

  const filterAndSortServices = () => {
    let filtered = [...services];
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          (item.srid?.toString() || '').includes(query) ||
          (item.plantName || '').toLowerCase().includes(query)
      );
    }
    if (filterStatus !== 'all') {
      filtered = filtered.filter((item) => item.status === filterStatus);
    }
    filtered.sort((a, b) => {
      if (sortType === 'srid') {
        return sortOrder === 'asc' ? a.srid - b.srid : b.srid - a.srid;
      } else if (sortType === 'date') {
        const dateA = new Date(a.requestDate);
        const dateB = new Date(b.requestDate);
        return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
      } else {
        const nameA = (a.plantName || '').toLowerCase();
        const nameB = (b.plantName || '').toLowerCase();
        return sortOrder === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
      }
    });
    setFilteredServices(filtered);
  };

  const handleRowClick = async (service) => {
    setSelectedService(service);
    setModalLoading(true);
    setShowHistorySheet(true);
    try {
      const response = await axios.get(`${API_BASE}/admin/services/${service.srid}`);
      if (response.data.status === 'success') {
        setServiceDetails(response.data);
      }
    } catch (error) {
      setServiceDetails(null);
    } finally {
      setModalLoading(false);
    }
  };

  const loadEmployeesForEquipment = async (equipment, service) => {
    setSelectedEquipment(equipment);
    setSelectedService(service);
    try {
      const response = await axios.get(`${API_BASE}/admin/services/available-employees/${service.plantId}`);
      if (response.data.status === 'success') {
        const employeesData = response.data.employees || [];
        setEmployees(employeesData);
        
        for (const emp of employeesData) {
          await fetchEmployeePendingServices(emp.id);
        }
        
        if (employeesData.length === 0) {
          Alert.alert('No Employees', 'No employees available in this district');
        } else {
          setShowAssignSheet(true);
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load employees');
    }
  };

  const fetchEmployeePendingServices = async (employeeId) => {
    if (employeePendingServices[employeeId]) return;
    
    setLoadingPending(prev => ({ ...prev, [employeeId]: true }));
    try {
      const response = await axios.get(`${API_BASE}/admin/employee-pending-services/${employeeId}`);
      if (response.data.status === 'success') {
        setEmployeePendingServices(prev => ({
          ...prev,
          [employeeId]: response.data.pendingServices || []
        }));
      }
    } catch (error) {
      setEmployeePendingServices(prev => ({
        ...prev,
        [employeeId]: []
      }));
    } finally {
      setLoadingPending(prev => ({ ...prev, [employeeId]: false }));
    }
  };

  const showAssignConfirmation = (employee) => {
    setSelectedEmployee(employee);
    setShowConfirmAssign(true);
  };

  const confirmAssignEquipment = async () => {
    setAssigning(true);
    try {
      const response = await axios.post(`${API_BASE}/admin/service/assign-equipment`, {
        srid: selectedService.srid,
        srSlNo: selectedEquipment.slNo,
        employeeId: selectedEmployee.id,
      });
      if (response.data.status === 'success') {
        Alert.alert('Success', `Assigned to ${selectedEmployee.name}`);
        setShowAssignSheet(false);
        setShowConfirmAssign(false);
        const refreshResponse = await axios.get(`${API_BASE}/admin/services/${selectedService.srid}`);
        if (refreshResponse.data.status === 'success') {
          setServiceDetails(refreshResponse.data);
        }
        await loadServices();
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to assign');
    } finally {
      setAssigning(false);
    }
  };

  const viewFileInBrowser = async (fileName) => {
    if (isOpeningFile) return;
    if (!fileName || fileName === '-') {
      Alert.alert('No Attachment', 'No file attached');
      return;
    }
    setIsOpeningFile(true);
    setOpeningFile(fileName);
    try {
      const timestamp = Date.now();
      const fileUrl = `${API_BASE}/files/${fileName}?t=${timestamp}&force=1`;
      await WebBrowser.openBrowserAsync(fileUrl);
    } catch (error) {
      Alert.alert('Error', 'Could not open file');
    } finally {
      setTimeout(() => {
        setIsOpeningFile(false);
        setOpeningFile(null);
      }, 2000);
    }
  };

  const getFileName = (filePath) => {
    if (!filePath || filePath === '-') return 'View Document';
    const parts = filePath.split('/');
    const fileName = parts[parts.length - 1];
    return fileName.length > 30 ? fileName.substring(0, 27) + '...' : fileName;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'C': return '#EF4444';
      case 'A': return '#F59E0B';
      case 'P': return '#F59E0B';
      default: return '#10B981';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'C': return 'Completed';
      case 'A': return 'Assigned';
      case 'P': return 'Assigned';
      default: return 'Open';
    }
  };

  const getPendingCountColor = (count) => {
    if (count === 0) return '#10B981';
    if (count === 1) return '#F59E0B';
    return '#EF4444';
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return `${date.getDate().toString().padStart(2, '0')} ${date.toLocaleString('en-US', { month: 'short' })} ${date.getFullYear()}`;
  };

  const formatDateOnly = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return `${date.getDate().toString().padStart(2, '0')} ${date.toLocaleString('en-US', { month: 'short' })} ${date.getFullYear()}`;
  };

  const getStatusCount = () => {
    const total = services.length;
    const open = services.filter(s => s.status === 'O').length;
    const assigned = services.filter(s => s.status === 'A' || s.status === 'P').length;
    const completed = services.filter(s => s.status === 'C').length;
    return { total, open, assigned, completed };
  };

  const statusCounts = getStatusCount();

  // Group pending services by plant - Only equipment names, no Pending text
  const groupPendingByPlant = (pendingServices) => {
    const grouped = {};
    pendingServices.forEach(item => {
      if (!grouped[item.plantName]) {
        grouped[item.plantName] = [];
      }
      grouped[item.plantName].push(item.equipmentName);
    });
    return grouped;
  };

  const TableHeader = () => (
    <View style={styles.tableHeader}>
      <Text style={[styles.headerText, styles.snoHeader]}>S.No</Text>
      <Text style={[styles.headerText, styles.sridHeader]}>SR ID</Text>
      <Text style={[styles.headerText, styles.plantHeader]}>Plant</Text>
      <Text style={[styles.headerText, styles.dateHeader]}>Date</Text>
      <Text style={[styles.headerText, styles.statusHeader]}>Status</Text>
    </View>
  );

  const TableRow = ({ item, index }) => (
    <TouchableOpacity style={[styles.tableRow, index % 2 === 0 ? styles.evenRow : styles.oddRow]} onPress={() => handleRowClick(item)}>
      <Text style={[styles.tableCell, styles.snoCell]}>{index + 1}</Text>
      <Text style={[styles.tableCell, styles.sridCell]}>{item.srid}</Text>
      <Text style={[styles.tableCell, styles.plantCell]}>{item.plantName || '-'}</Text>
      <Text style={[styles.tableCell, styles.dateCell]}>{formatDate(item.requestDate)}</Text>
      <Text style={[styles.tableCell, styles.statusCell, { color: getStatusColor(item.status) }]}>{getStatusText(item.status)}</Text>
    </TouchableOpacity>
  );

  const PartsTableHeader = () => (
    <View style={styles.partsTableHeader}>
      <Text style={[styles.partsHeaderText, styles.partsHeaderName]}>Part Name</Text>
      <Text style={[styles.partsHeaderText, styles.partsHeaderQty]}>Qty</Text>
      <Text style={[styles.partsHeaderText, styles.partsHeaderRate]}>Rate</Text>
      <Text style={[styles.partsHeaderText, styles.partsHeaderTotal]}>Total</Text>
    </View>
  );

  const PartsTableRow = ({ part, index }) => (
    <View style={[styles.partsTableRow, index % 2 === 0 ? styles.partsEvenRow : styles.partsOddRow]}>
      <Text style={[styles.partsCell, styles.partsCellName]}>{part.partName}</Text>
      <Text style={[styles.partsCell, styles.partsCellQty]}>{part.quantity}</Text>
      <Text style={[styles.partsCell, styles.partsCellRate]}>{formatNumber(part.rate)}</Text>
      <Text style={[styles.partsCell, styles.partsCellTotal]}>{formatNumber(part.quantity * part.rate)}</Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1976d2" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Service Requests</Text>
        <Text style={styles.headerSubtitle}>{filteredServices.length} records</Text>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.sortDropdownContainer}>
          <TouchableOpacity style={styles.sortBtn} onPress={() => setShowSortDropdown(!showSortDropdown)}>
            <Ionicons name="swap-vertical-outline" size={16} color="#1976d2" />
            <Text style={styles.sortBtnText}>{getSortLabel()}</Text>
          </TouchableOpacity>
          {showSortDropdown && (
            <View style={styles.sortMenu}>
              <TouchableOpacity style={styles.sortMenuItem} onPress={() => handleSort('srid')}>
                <Text style={[styles.sortMenuText, sortType === 'srid' && styles.sortMenuTextActive]}>SR ID {sortType === 'srid' && getSortArrow()}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.sortMenuItem} onPress={() => handleSort('date')}>
                <Text style={[styles.sortMenuText, sortType === 'date' && styles.sortMenuTextActive]}>Date {sortType === 'date' && getSortArrow()}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.sortMenuItem} onPress={() => handleSort('plant')}>
                <Text style={[styles.sortMenuText, sortType === 'plant' && styles.sortMenuTextActive]}>Plant Name {sortType === 'plant' && getSortArrow()}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={18} color="#94A3B8" />
          <TextInput style={styles.searchInput} placeholder="Search..." value={searchQuery} onChangeText={setSearchQuery} />
          {searchQuery !== '' && <TouchableOpacity onPress={() => setSearchQuery('')}><Ionicons name="close-circle" size={16} color="#94A3B8" /></TouchableOpacity>}
        </View>

        <View style={styles.statusDropdownContainer}>
          <TouchableOpacity style={styles.statusBtn} onPress={() => setShowStatusDropdown(!showStatusDropdown)}>
            <Text style={styles.statusBtnText}>{filterStatus === 'all' ? 'All' : filterStatus === 'O' ? 'Open' : (filterStatus === 'A' || filterStatus === 'P') ? 'Assigned' : 'Completed'}</Text>
            <Ionicons name="chevron-down" size={16} color="#1976d2" />
          </TouchableOpacity>
          {showStatusDropdown && (
            <View style={styles.statusMenu}>
              <TouchableOpacity style={styles.statusMenuItem} onPress={() => { setFilterStatus('all'); setShowStatusDropdown(false); }}>
                <Text style={[styles.statusMenuText, filterStatus === 'all' && styles.statusMenuTextActive]}>All ({statusCounts.total})</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.statusMenuItem} onPress={() => { setFilterStatus('O'); setShowStatusDropdown(false); }}>
                <Text style={[styles.statusMenuText, filterStatus === 'O' && styles.statusMenuTextActive]}>Open ({statusCounts.open})</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.statusMenuItem} onPress={() => { setFilterStatus('A'); setShowStatusDropdown(false); }}>
                <Text style={[styles.statusMenuText, filterStatus === 'A' && styles.statusMenuTextActive]}>Assigned ({statusCounts.assigned})</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.statusMenuItem} onPress={() => { setFilterStatus('C'); setShowStatusDropdown(false); }}>
                <Text style={[styles.statusMenuText, filterStatus === 'C' && styles.statusMenuTextActive]}>Completed ({statusCounts.completed})</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      <TableHeader />
      <FlatList
        data={filteredServices}
        renderItem={({ item, index }) => <TableRow item={item} index={index} />}
        keyExtractor={(item) => item.srid?.toString()}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#1976d2']} />}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={<View style={styles.emptyContainer}><Text style={styles.emptyTitle}>No services found</Text></View>}
      />

      <TouchableOpacity style={styles.fab} onPress={() => setShowCreateModal(true)}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      <Modal visible={showCreateModal} animationType="slide" onRequestClose={() => setShowCreateModal(false)}>
        <CreateServiceScreen user={user} onBack={() => { setShowCreateModal(false); loadServices(); }} />
      </Modal>

      {/* Assign Employee Bottom Sheet */}
      <Modal visible={showAssignSheet} transparent={true} animationType="slide" onRequestClose={() => setShowAssignSheet(false)}>
        <View style={styles.bottomSheetOverlay}>
          <View style={styles.bottomSheetContainer}>
            <View style={styles.bottomSheetHeader}>
              <Text style={styles.bottomSheetTitle}>Select Employee</Text>
              <TouchableOpacity onPress={() => setShowAssignSheet(false)}><Ionicons name="close" size={24} color="#666" /></TouchableOpacity>
            </View>
            {selectedEquipment && (
              <View style={styles.serviceInfo}>
                <Text style={styles.serviceInfoText}>{selectedEquipment.equipmentName}</Text>
                <Text style={styles.serviceInfoSub}>SR-{selectedService?.srid}</Text>
              </View>
            )}
            <ScrollView style={styles.employeeList}>
              {employees.length > 0 ? employees.map((emp) => {
                const pendingServices = employeePendingServices[emp.id] || [];
                const pendingCount = pendingServices.length;
                const isLoading = loadingPending[emp.id];
                const groupedPending = groupPendingByPlant(pendingServices);
                
                return (
                  <View key={emp.id} style={styles.employeeCard}>
                    <View style={styles.employeeHeader}>
                      <View style={styles.employeeAvatar}>
                        <Text style={styles.employeeInitial}>{emp.name?.charAt(0) || 'E'}</Text>
                      </View>
                      <View style={styles.employeeMainInfo}>
                        <Text style={styles.employeeName}>{emp.name}</Text>
                        <Text style={styles.employeeRole}>{emp.role === 'EN' ? 'Engineer' : 'Technician'}</Text>
                      </View>
                      <View style={styles.pendingCountContainer}>
                        <View style={[styles.pendingCountBadge, { backgroundColor: getPendingCountColor(pendingCount) }]}>
                          <Text style={styles.pendingCountText}>{pendingCount}</Text>
                        </View>
                      </View>
                    </View>
                    
                    {/* Pending Services List - Only Equipment Names, No Pending Text */}
                    {pendingCount > 0 && !isLoading && (
                      <View style={styles.pendingServicesSection}>
                        {Object.keys(groupedPending).map((plantName, plantIdx) => (
                          <View key={plantIdx} style={styles.plantGroup}>
                            <Text style={styles.plantGroupName}>{plantName}</Text>
                            {groupedPending[plantName].map((equipmentName, idx) => (
                              <View key={idx} style={styles.pendingServiceRow}>
                                <View style={styles.pendingServiceBullet}>
                                  <View style={styles.bulletPoint} />
                                </View>
                                <Text style={styles.pendingServiceEquip}>{equipmentName}</Text>
                              </View>
                            ))}
                          </View>
                        ))}
                      </View>
                    )}
                    
                    {isLoading && (
                      <View style={styles.pendingServicesSection}>
                        <ActivityIndicator size="small" color="#1976d2" />
                      </View>
                    )}
                    
                    <TouchableOpacity style={styles.assignBtn} onPress={() => showAssignConfirmation(emp)}>
                      <Text style={styles.assignBtnText}>Assign</Text>
                    </TouchableOpacity>
                  </View>
                );
              }) : (
                <View style={styles.noEmployees}><Text style={styles.noEmployeesText}>No employees available</Text></View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Confirm Modal */}
      <Modal visible={showConfirmAssign} transparent={true} animationType="slide" onRequestClose={() => setShowConfirmAssign(false)}>
        <View style={styles.bottomSheetOverlay}>
          <View style={styles.confirmSheetContainer}>
            <View style={styles.bottomSheetHeader}>
              <Text style={styles.bottomSheetTitle}>Confirm Assignment</Text>
              <TouchableOpacity onPress={() => setShowConfirmAssign(false)}><Ionicons name="close" size={24} color="#666" /></TouchableOpacity>
            </View>
            <View style={styles.confirmContent}>
              <Text style={styles.confirmMessage}>Assign this equipment?</Text>
              <View style={styles.confirmDetails}>
                <View style={styles.confirmRow}>
                  <Text style={styles.confirmLabel}>Equipment:</Text>
                  <Text style={styles.confirmValue}>{selectedEquipment?.equipmentName}</Text>
                </View>
                <View style={styles.confirmRow}>
                  <Text style={styles.confirmLabel}>To:</Text>
                  <Text style={styles.confirmValue}>{selectedEmployee?.name}</Text>
                </View>
                <View style={styles.confirmRow}>
                  <Text style={styles.confirmLabel}>Role:</Text>
                  <Text style={styles.confirmValue}>{selectedEmployee?.role === 'EN' ? 'Engineer' : 'Technician'}</Text>
                </View>
                <View style={styles.confirmRow}>
                  <Text style={styles.confirmLabel}>Pending:</Text>
                  <Text style={[styles.confirmValue, { color: getPendingCountColor(selectedEmployee?.pendingCount || 0), fontWeight: 'bold' }]}>
                    {selectedEmployee?.pendingCount || 0} service{selectedEmployee?.pendingCount !== 1 ? 's' : ''}
                  </Text>
                </View>
              </View>
            </View>
            <View style={styles.confirmButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setShowConfirmAssign(false)} disabled={assigning}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmButton} onPress={confirmAssignEquipment} disabled={assigning}>
                {assigning ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.confirmButtonText}>Assign</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Service Details Modal */}
      <Modal visible={showHistorySheet} transparent={true} animationType="slide" onRequestClose={() => setShowHistorySheet(false)}>
        <View style={styles.bottomSheetOverlay}>
          <View style={styles.historySheetContainer}>
            <View style={styles.bottomSheetHeader}>
              <Text style={styles.bottomSheetTitle}>Service Details</Text>
              <TouchableOpacity onPress={() => setShowHistorySheet(false)}><Ionicons name="close" size={24} color="#666" /></TouchableOpacity>
            </View>
            {modalLoading ? (
              <View style={styles.modalLoadingContainer}><ActivityIndicator size="large" color="#1976d2" /><Text style={styles.modalLoadingText}>Loading details...</Text></View>
            ) : (
              <ScrollView style={styles.historySheetContent}>
                {selectedService && serviceDetails && (
                  <>
                    <View style={styles.infoCard}>
                      <Text style={styles.sectionHeader}>Service Information</Text>
                      <View style={styles.infoRow}><Text style={styles.infoLabel}>SR ID</Text><Text style={styles.infoValue}>SR-{selectedService.srid}</Text></View>
                      <View style={styles.infoRow}><Text style={styles.infoLabel}>Plant</Text><Text style={styles.infoValue}>{selectedService.plantName || '-'}</Text></View>
                      <View style={styles.infoRow}><Text style={styles.infoLabel}>District</Text><Text style={styles.infoValue}>{selectedService.districtName || '-'}</Text></View>
                      <View style={styles.infoRow}><Text style={styles.infoLabel}>Request Date</Text><Text style={styles.infoValue}>{formatDate(selectedService.requestDate)}</Text></View>
                      <View style={styles.infoRow}><Text style={styles.infoLabel}>Status</Text><Text style={[styles.infoValue, { color: getStatusColor(selectedService.status) }]}>{getStatusText(selectedService.status)}</Text></View>
                      {selectedService.problem && selectedService.problem !== '-' && <View style={styles.descriptionCard}><Text style={styles.descriptionText}>{selectedService.problem}</Text></View>}
                    </View>

                    <Text style={styles.sectionHeader}>Equipment Details</Text>
                    {serviceDetails?.equipments?.length > 0 ? serviceDetails.equipments.map((eq, idx) => {
                      const serviceRateAmount = eq.serviceRate || 0;
                      const partsTotal = eq.parts?.reduce((sum, p) => sum + (p.quantity * p.rate), 0) || 0;
                      const equipmentTotal = serviceRateAmount + partsTotal;
                      
                      return (
                        <View key={idx} style={styles.equipmentCard}>
                          <View style={styles.equipmentHeader}>
                            <Text style={styles.equipmentName}>{eq.equipmentName || '-'}</Text>
                            {eq.status === 'O' && (
                              <TouchableOpacity style={styles.assignIconBtn} onPress={() => loadEmployeesForEquipment(eq, selectedService)}>
                                <Text style={styles.assignIconText}>Assign</Text>
                              </TouchableOpacity>
                            )}
                            {(eq.status === 'A' || eq.status === 'P') && (
                              <View style={[styles.statusBadge, { backgroundColor: '#FEF3C7' }]}>
                                <Text style={[styles.statusBadgeText, { color: '#F59E0B' }]}>Assigned</Text>
                              </View>
                            )}
                            {eq.status === 'C' && (
                              <View style={[styles.statusBadge, { backgroundColor: '#FEE2E2' }]}>
                                <Text style={[styles.statusBadgeText, { color: '#EF4444' }]}>Completed</Text>
                              </View>
                            )}
                          </View>
                          
                          <View style={styles.equipmentBody}>
                            <View style={styles.equipmentRow}>
                              <Text style={styles.equipmentLabel}>Model Number:</Text>
                              <Text style={styles.equipmentValue}>{eq.modelNumber || '-'}</Text>
                            </View>
                            
                            {eq.serviceTypeName && (
                              <View style={styles.equipmentRow}>
                                <Text style={styles.equipmentLabel}>Service Type:</Text>
                                <Text style={styles.equipmentValue}>{eq.serviceTypeName}</Text>
                              </View>
                            )}
                            
                            {eq.issueName && eq.issueName !== '-' && (
                              <View style={styles.equipmentRow}>
                                <Text style={styles.equipmentLabel}>Issue:</Text>
                                <Text style={styles.equipmentValue}>{eq.issueName}</Text>
                              </View>
                            )}
                            
                            {eq.remarks && eq.remarks !== '-' && (
                              <View style={styles.equipmentRow}>
                                <Text style={styles.equipmentLabel}>Remarks:</Text>
                                <Text style={styles.equipmentValue}>{eq.remarks}</Text>
                              </View>
                            )}
                            
                            {eq.serviceDate && (
                              <View style={styles.equipmentRow}>
                                <Text style={styles.equipmentLabel}>Service Date:</Text>
                                <Text style={styles.equipmentValue}>{formatDateOnly(eq.serviceDate)}</Text>
                              </View>
                            )}
                            
                            {eq.serviceRate > 0 && (
                              <View style={styles.equipmentRow}>
                                <Text style={styles.equipmentLabel}>Service Rate:</Text>
                                <Text style={[styles.equipmentValue, { color: '#1976d2', fontWeight: '500' }]}>{formatNumber(eq.serviceRate)}</Text>
                              </View>
                            )}
                            
                            {(eq.status === 'A' || eq.status === 'P') && eq.servicedByName && (
                              <View style={styles.assignedRow}>
                                <Text style={styles.assignedLabel}>Assigned To</Text>
                                <Text style={styles.assignedValue}>{eq.servicedByName}</Text>
                              </View>
                            )}
                            
                            {eq.status === 'C' && eq.servicedByName && (
                              <View style={styles.completedRow}>
                                <Text style={styles.completedLabel}>Completed By</Text>
                                <Text style={styles.completedValue}>{eq.servicedByName}</Text>
                              </View>
                            )}
                            
                            {eq.parts && eq.parts.length > 0 && (
                              <View style={styles.partsContainer}>
                                <Text style={styles.partsTitle}>Parts Used ({eq.parts.length})</Text>
                                <PartsTableHeader />
                                {eq.parts.map((part, pIdx) => <PartsTableRow key={pIdx} part={part} index={pIdx} />)}
                                <View style={styles.partsTotalContainer}>
                                  <Text style={styles.partsTotalLabel}>Parts Total</Text>
                                  <Text style={styles.partsTotalAmount}>{formatNumber(partsTotal)}</Text>
                                </View>
                              </View>
                            )}
                            
                            {equipmentTotal > 0 && (
                              <View style={styles.equipmentGrandTotal}>
                                <Text style={styles.equipmentGrandTotalLabel}>Equipment Total</Text>
                                <Text style={styles.equipmentGrandTotalAmount}>{formatNumber(equipmentTotal)}</Text>
                              </View>
                            )}
                            
                            {eq.attachFile && eq.attachFile !== '-' && (
                              <TouchableOpacity style={styles.attachButton} onPress={() => viewFileInBrowser(eq.attachFile)} disabled={isOpeningFile}>
                                <Ionicons name="document-attach-outline" size={16} color="#1976d2" />
                                <Text style={styles.attachButtonText}>{isOpeningFile && openingFile === eq.attachFile ? 'Opening...' : getFileName(eq.attachFile)}</Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        </View>
                      );
                    }) : <View style={styles.noEquipmentCard}><Text style={styles.noEquipmentText}>No equipment details</Text></View>}
                  </>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, color: '#666' },
  header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  headerSubtitle: { fontSize: 12, color: '#999', marginTop: 2 },
  searchContainer: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, gap: 10 },
  sortDropdownContainer: { position: 'relative', zIndex: 102 },
  sortBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6, borderWidth: 1, borderColor: '#ddd', gap: 6 },
  sortBtnText: { fontSize: 12, color: '#1976d2', fontWeight: '500' },
  sortMenu: { position: 'absolute', top: 42, left: 0, backgroundColor: '#fff', borderRadius: 6, elevation: 5, minWidth: 160, borderWidth: 1, borderColor: '#ddd', zIndex: 103 },
  sortMenuItem: { paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  sortMenuText: { fontSize: 12, color: '#666' },
  sortMenuTextActive: { color: '#1976d2', fontWeight: '600' },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: '#ddd', gap: 8 },
  searchInput: { flex: 1, fontSize: 14, padding: 0 },
  statusDropdownContainer: { position: 'relative', zIndex: 100 },
  statusBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 6, borderWidth: 1, borderColor: '#ddd', gap: 8 },
  statusBtnText: { fontSize: 13, color: '#1976d2' },
  statusMenu: { position: 'absolute', top: 42, right: 0, backgroundColor: '#fff', borderRadius: 6, elevation: 5, minWidth: 140, borderWidth: 1, borderColor: '#ddd', zIndex: 101 },
  statusMenuItem: { paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  statusMenuText: { fontSize: 13, color: '#666' },
  statusMenuTextActive: { color: '#1976d2', fontWeight: '600' },
  tableHeader: { flexDirection: 'row', backgroundColor: '#1976d2', paddingVertical: 12, paddingHorizontal: 12, marginHorizontal: 12, borderRadius: 6 },
  headerText: { color: '#fff', fontSize: 12, fontWeight: 'bold', textAlign: 'center' },
  snoHeader: { width: 45, textAlign: 'center' },
  sridHeader: { width: 70, textAlign: 'center' },
  plantHeader: { flex: 2, textAlign: 'left' },
  dateHeader: { width: 85, textAlign: 'center' },
  statusHeader: { width: 85, textAlign: 'center' },
  tableRow: { flexDirection: 'row', paddingVertical: 14, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#eee', marginHorizontal: 12 },
  evenRow: { backgroundColor: '#fff' },
  oddRow: { backgroundColor: '#fafafa' },
  tableCell: { fontSize: 12, color: '#333', textAlign: 'center' },
  snoCell: { width: 45, textAlign: 'center' },
  sridCell: { width: 70, fontWeight: '600', textAlign: 'center' },
  plantCell: { flex: 2, textAlign: 'left' },
  dateCell: { width: 85, textAlign: 'center' },
  statusCell: { width: 85, fontWeight: '600', textAlign: 'center' },
  listContent: { paddingBottom: 80 },
  emptyContainer: { alignItems: 'center', padding: 60 },
  emptyTitle: { fontSize: 16, color: '#999' },
  fab: { position: 'absolute', bottom: 20, right: 20, backgroundColor: '#1976d2', width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', elevation: 4 },
  
  bottomSheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  bottomSheetContainer: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '80%' },
  confirmSheetContainer: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '50%' },
  historySheetContainer: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '85%' },
  bottomSheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#eee' },
  bottomSheetTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  
  serviceInfo: { padding: 16, backgroundColor: '#f8f9fa', marginHorizontal: 16, marginTop: 16, borderRadius: 6 },
  serviceInfoText: { fontSize: 14, fontWeight: 'bold', color: '#1976d2' },
  serviceInfoSub: { fontSize: 12, color: '#666', marginTop: 4 },
  
  employeeList: { padding: 16 },
  employeeCard: { 
    backgroundColor: '#fff', 
    borderRadius: 12, 
    marginBottom: 16, 
    borderWidth: 1, 
    borderColor: '#e8e8e8',
    overflow: 'hidden'
  },
  employeeHeader: { flexDirection: 'row', alignItems: 'center', padding: 16, paddingBottom: 12 },
  employeeAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#E3F2FD', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  employeeInitial: { fontSize: 16, fontWeight: 'bold', color: '#1976d2' },
  employeeMainInfo: { flex: 1 },
  employeeName: { fontSize: 15, fontWeight: '600', color: '#333' },
  employeeRole: { fontSize: 12, color: '#666', marginTop: 2 },
  pendingCountContainer: { marginLeft: 8 },
  pendingCountBadge: { 
    width: 28, 
    height: 28, 
    borderRadius: 14, 
    alignItems: 'center', 
    justifyContent: 'center'
  },
  pendingCountText: { fontSize: 12, fontWeight: 'bold', color: '#fff' },
  
  pendingServicesSection: { 
    paddingHorizontal: 16, 
    paddingBottom: 12,
    paddingTop: 4
  },
  plantGroup: { marginBottom: 10 },
  plantGroupName: { fontSize: 13, fontWeight: '600', color: '#1a237e', marginBottom: 6, paddingLeft: 4 },
  pendingServiceRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 4,
    paddingVertical: 2,
    paddingHorizontal: 8
  },
  pendingServiceBullet: { width: 16, alignItems: 'center' },
  bulletPoint: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#F59E0B' },
  pendingServiceEquip: { fontSize: 12, color: '#555', flex: 1 },
  
  assignBtn: { 
    backgroundColor: '#1976d2', 
    paddingVertical: 8, 
    paddingHorizontal: 20,
    marginHorizontal: 16, 
    marginBottom: 16, 
    borderRadius: 20,
    alignItems: 'center',
    alignSelf: 'flex-start'
  },
  assignBtnText: { color: '#fff', fontWeight: '600', fontSize: 12 },
  
  noEmployees: { padding: 40, alignItems: 'center' },
  noEmployeesText: { fontSize: 14, color: '#999' },
  
  confirmContent: { padding: 20 },
  confirmMessage: { fontSize: 14, color: '#666', marginBottom: 16, textAlign: 'center' },
  confirmDetails: { backgroundColor: '#f8f9fa', borderRadius: 6, padding: 16 },
  confirmRow: { flexDirection: 'row', marginBottom: 8 },
  confirmLabel: { width: 80, fontSize: 13, color: '#666' },
  confirmValue: { flex: 1, fontSize: 13, color: '#333', fontWeight: '500' },
  confirmButtons: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#eee', paddingVertical: 12, paddingHorizontal: 20 },
  cancelButton: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  confirmButton: { flex: 1, paddingVertical: 12, alignItems: 'center', backgroundColor: '#1565C0', borderRadius: 8 },
  cancelButtonText: { fontSize: 16, color: '#666' },
  confirmButtonText: { fontSize: 16, color: '#fff', fontWeight: '600' },
  
  historySheetContent: { padding: 16 },
  infoCard: { backgroundColor: '#fff', borderRadius: 6, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#eee' },
  sectionHeader: { fontSize: 14, fontWeight: 'bold', color: '#333', marginBottom: 12, borderLeftWidth: 3, borderLeftColor: '#1976d2', paddingLeft: 10 },
  infoRow: { flexDirection: 'row', marginBottom: 8 },
  infoLabel: { width: 100, fontSize: 12, color: '#666' },
  infoValue: { flex: 1, fontSize: 13, color: '#333' },
  descriptionCard: { backgroundColor: '#f8f9fa', borderRadius: 6, padding: 12, marginTop: 8 },
  descriptionText: { fontSize: 13, color: '#666', lineHeight: 18 },
  equipmentCard: { backgroundColor: '#fff', borderRadius: 6, marginBottom: 12, borderWidth: 1, borderColor: '#eee', overflow: 'hidden' },
  equipmentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, backgroundColor: '#fafafa', borderBottomWidth: 1, borderBottomColor: '#eee' },
  equipmentName: { fontSize: 14, fontWeight: '600', color: '#333', flex: 1 },
  assignIconBtn: { backgroundColor: '#1565C0', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  assignIconText: { fontSize: 12, color: '#fff', fontWeight: '600' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusBadgeText: { fontSize: 11, fontWeight: '600' },
  equipmentBody: { padding: 12 },
  equipmentRow: { flexDirection: 'row', marginBottom: 8, flexWrap: 'wrap', alignItems: 'center' },
  equipmentLabel: { width: 110, fontSize: 12, color: '#666' },
  equipmentValue: { flex: 1, fontSize: 12, color: '#333' },
  assignedRow: { flexDirection: 'row', marginBottom: 8, alignItems: 'center', paddingVertical: 4 },
  assignedLabel: { width: 110, fontSize: 12, fontWeight: '600', color: '#F59E0B' },
  assignedValue: { flex: 1, fontSize: 12, color: '#F59E0B', fontWeight: '500', marginLeft: 8 },
  completedRow: { flexDirection: 'row', marginBottom: 8, alignItems: 'center', paddingVertical: 4 },
  completedLabel: { width: 110, fontSize: 12, fontWeight: '600', color: '#EF4444' },
  completedValue: { flex: 1, fontSize: 12, color: '#EF4444', fontWeight: '500', marginLeft: 8 },
  partsContainer: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#eee' },
  partsTitle: { fontSize: 13, fontWeight: '600', color: '#1976d2', marginBottom: 10 },
  partsTableHeader: { flexDirection: 'row', backgroundColor: '#E3F2FD', paddingVertical: 10, paddingHorizontal: 8, borderRadius: 6, marginBottom: 4 },
  partsHeaderText: { fontSize: 11, fontWeight: '600', color: '#1565C0' },
  partsHeaderName: { flex: 2 },
  partsHeaderQty: { width: 50, textAlign: 'center' },
  partsHeaderRate: { width: 80, textAlign: 'right' },
  partsHeaderTotal: { width: 90, textAlign: 'right' },
  partsTableRow: { flexDirection: 'row', paddingVertical: 8, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  partsEvenRow: { backgroundColor: '#fff' },
  partsOddRow: { backgroundColor: '#fafafa' },
  partsCell: { fontSize: 11, color: '#333' },
  partsCellName: { flex: 2 },
  partsCellQty: { width: 50, textAlign: 'center', color: '#666' },
  partsCellRate: { width: 80, textAlign: 'right', color: '#666' },
  partsCellTotal: { width: 90, textAlign: 'right', fontWeight: '600', color: '#2e7d32' },
  partsTotalContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#e0e0e0' },
  partsTotalLabel: { fontSize: 12, fontWeight: 'bold', color: '#333' },
  partsTotalAmount: { fontSize: 13, fontWeight: 'bold', color: '#2e7d32' },
  equipmentGrandTotal: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 10, borderTopWidth: 2, borderTopColor: '#1976d2', backgroundColor: '#E3F2FD', paddingHorizontal: 10, paddingBottom: 8, borderRadius: 6 },
  equipmentGrandTotalLabel: { fontSize: 13, fontWeight: 'bold', color: '#1565C0' },
  equipmentGrandTotalAmount: { fontSize: 15, fontWeight: 'bold', color: '#2e7d32' },
  attachButton: { flexDirection: 'row', alignItems: 'center', marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#eee', gap: 6 },
  attachButtonText: { fontSize: 12, color: '#1976d2' },
  noEquipmentCard: { padding: 30, alignItems: 'center' },
  noEquipmentText: { fontSize: 13, color: '#999' },
  modalLoadingContainer: { padding: 60, alignItems: 'center' },
  modalLoadingText: { marginTop: 12, fontSize: 14, color: '#666' },
});

export { AdminHomeScreen };