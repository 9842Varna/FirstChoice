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

const API_BASE = 'http://192.168.29.223:2927/api';

//const API_BASE = 'http://10.196.32.8:2927/api';



// Format number with commas (Indian format)
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

export default function AdminPlantsScreen({ user, navigation }) {
  const [plants, setPlants] = useState([]);
  const [filteredPlants, setFilteredPlants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedPlants, setExpandedPlants] = useState({});
  const [selectedService, setSelectedService] = useState(null);
  const [serviceDetails, setServiceDetails] = useState(null);
  const [showServiceDetails, setShowServiceDetails] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [sortType, setSortType] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');

  useEffect(() => {
    loadPlants();
  }, []);

  useEffect(() => {
    filterAndSortPlants();
  }, [plants, searchQuery, sortType, sortOrder]);

  const loadPlants = async () => {
    try {
      const response = await axios.get(`${API_BASE}/admin/plants`);
      if (response.data.status === 'success') {
        const plantsWithServices = await Promise.all(
          response.data.plants.map(async (plant) => {
            try {
              const servicesRes = await axios.get(`${API_BASE}/admin/services/by-plant/${plant.id}`);
              return {
                ...plant,
                services: servicesRes.data.status === 'success' ? servicesRes.data.services || [] : [],
                openCount: 0,
                assignedCount: 0,
                completedCount: 0
              };
            } catch (error) {
              return {
                ...plant,
                services: [],
                openCount: 0,
                assignedCount: 0,
                completedCount: 0
              };
            }
          })
        );
        
        plantsWithServices.forEach(plant => {
          plant.openCount = plant.services.filter(s => s.status === 'O').length;
          plant.assignedCount = plant.services.filter(s => s.status === 'A' || s.status === 'P').length;
          plant.completedCount = plant.services.filter(s => s.status === 'C').length;
        });
        
        setPlants(plantsWithServices);
      }
    } catch (error) {
      console.error('Error loading plants:', error);
      Alert.alert('Error', 'Failed to load plants');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPlants();
    setRefreshing(false);
  };

  const filterAndSortPlants = () => {
    let filtered = [...plants];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          (item.name || '').toLowerCase().includes(query) ||
          (item.customer || '').toLowerCase().includes(query) ||
          (item.districtName || '').toLowerCase().includes(query) ||
          (item.inchargeName || '').toLowerCase().includes(query)
      );
    }

    filtered.sort((a, b) => {
      if (sortType === 'name') {
        const nameA = (a.name || '').toLowerCase();
        const nameB = (b.name || '').toLowerCase();
        return sortOrder === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
      } else if (sortType === 'customer') {
        const custA = (a.customer || '').toLowerCase();
        const custB = (b.customer || '').toLowerCase();
        return sortOrder === 'asc' ? custA.localeCompare(custB) : custB.localeCompare(custA);
      } else if (sortType === 'district') {
        const distA = (a.districtName || '').toLowerCase();
        const distB = (b.districtName || '').toLowerCase();
        return sortOrder === 'asc' ? distA.localeCompare(distB) : distB.localeCompare(distA);
      }
      return 0;
    });

    setFilteredPlants(filtered);
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
      case 'name': return `Plant ${arrow}`;
      case 'customer': return `Customer ${arrow}`;
      case 'district': return `District ${arrow}`;
      default: return 'Sort';
    }
  };

  const togglePlant = (plantId) => {
    setExpandedPlants(prev => ({
      ...prev,
      [plantId]: !prev[plantId]
    }));
  };

  const openServiceDetails = async (service) => {
    setSelectedService(service);
    setModalLoading(true);
    setShowServiceDetails(true);
    
    try {
      const response = await axios.get(`${API_BASE}/admin/services/${service.srid}`);
      if (response.data.status === 'success') {
        setServiceDetails(response.data);
      } else {
        Alert.alert('Error', response.data.message || 'Failed to load details');
      }
    } catch (error) {
      console.error('Error loading service details:', error);
      Alert.alert('Error', 'Failed to load service details');
    } finally {
      setModalLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    const day = date.getDate().toString().padStart(2, '0');
    const month = date.toLocaleString('en-US', { month: 'short' });
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    const day = date.getDate().toString().padStart(2, '0');
    const month = date.toLocaleString('en-US', { month: 'short' });
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${day} ${month} ${year} ${hours}:${minutes}`;
  };

  const formatCapacity = (capacity) => {
    if (!capacity || capacity === 0) return '-';
    return `${capacity} MW`;
  };

  // ✅ UPDATED STATUS COLORS - Open: Green, Assigned: Orange, Completed: Red
  const getStatusColor = (status) => {
    switch (status) {
      case 'C': return '#EF4444';     // Completed - Red
      case 'A': return '#F59E0B';     // Assigned - Orange
      case 'P': return '#F59E0B';     // Assigned - Orange
      case 'O': return '#10B981';     // Open - Green
      default: return '#10B981';
    }
  };

  const getStatusBgColor = (status) => {
    switch (status) {
      case 'C': return '#FEE2E2';     // Completed - Light Red
      case 'A': return '#FEF3C7';     // Assigned - Light Orange
      case 'P': return '#FEF3C7';     // Assigned - Light Orange
      case 'O': return '#D1FAE5';     // Open - Light Green
      default: return '#D1FAE5';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'C': return 'Completed';
      case 'A': return 'Assigned';
      case 'P': return 'Assigned';
      case 'O': return 'Open';
      default: return 'Open';
    }
  };

  const viewDocument = async (fileName) => {
    if (!fileName || fileName === '-') {
      Alert.alert('No Document', 'No document attached to this service');
      return;
    }
    try {
      const timestamp = Date.now();
      const fileUrl = `${API_BASE}/files/${fileName}?t=${timestamp}&force=1`;
      await WebBrowser.openBrowserAsync(fileUrl);
    } catch (error) {
      console.error('Error opening document:', error);
      Alert.alert('Error', 'Could not open document');
    }
  };

  const getFileName = (filePath) => {
    if (!filePath || filePath === '-') return '-';
    const parts = filePath.split('/');
    const fileName = parts[parts.length - 1];
    if (fileName.length > 30) {
      return fileName.substring(0, 27) + '...';
    }
    return fileName;
  };

  // Services Table Header
  const ServicesTableHeader = () => (
    <View style={styles.servicesTableHeader}>
      <Text style={styles.servicesHeaderId}>SR ID</Text>
      <Text style={styles.servicesHeaderDate}>Request Date</Text>
      <Text style={styles.servicesHeaderEq}>Equipment</Text>
      <Text style={styles.servicesHeaderStatus}>Status</Text>
      <View style={styles.servicesHeaderAction} />
    </View>
  );

  // Services Table Row
  const ServicesTableRow = ({ service, index }) => (
    <TouchableOpacity 
      style={styles.servicesTableRow}
      onPress={() => openServiceDetails(service)}
      activeOpacity={0.7}
    >
      <Text style={styles.servicesCellId}>SR-{service.srid}</Text>
      <Text style={styles.servicesCellDate}>{formatDate(service.requestDate)}</Text>
      <Text style={styles.servicesCellEq}>{service.equipmentCount || 0}</Text>
      <Text style={[styles.servicesStatusText, { color: getStatusColor(service.status) }]}>
        {getStatusText(service.status)}
      </Text>
      <Ionicons name="chevron-forward" size={14} color="#CBD5E1" style={styles.servicesCellArrow} />
    </TouchableOpacity>
  );

  // Parts Table Header
  const PartsTableHeader = () => (
    <View style={styles.partsTableHeader}>
      <Text style={[styles.partsHeaderText, styles.partsHeaderName]}>Part Name</Text>
      <Text style={[styles.partsHeaderText, styles.partsHeaderQty]}>Qty</Text>
      <Text style={[styles.partsHeaderText, styles.partsHeaderRate]}>Rate</Text>
      <Text style={[styles.partsHeaderText, styles.partsHeaderTotal]}>Total</Text>
    </View>
  );

  // Parts Table Row with formatted currency
  const PartsTableRow = ({ part, index }) => (
    <View style={[styles.partsTableRow, index % 2 === 0 ? styles.partsEvenRow : styles.partsOddRow]}>
      <Text style={[styles.partsCell, styles.partsCellName]} numberOfLines={1}>{part.partName}</Text>
      <Text style={[styles.partsCell, styles.partsCellQty]}>{part.quantity}</Text>
      <Text style={[styles.partsCell, styles.partsCellRate]}>{formatNumber(part.rate)}</Text>
      <Text style={[styles.partsCell, styles.partsCellTotal]}>{formatNumber(part.quantity * part.rate)}</Text>
    </View>
  );

  // ✅ Updated Stats Row Colors
  const PlantCard = ({ plant }) => {
    const isExpanded = expandedPlants[plant.id];
    
    return (
      <View style={styles.plantCard}>
        <TouchableOpacity 
          style={styles.plantHeader}
          onPress={() => togglePlant(plant.id)}
          activeOpacity={0.7}
        >
          <Text style={styles.plantName}>{plant.name || '-'}</Text>
          <Ionicons 
            name={isExpanded ? "chevron-up" : "chevron-down"} 
            size={20} 
            color="#94A3B8" 
          />
        </TouchableOpacity>
        
        {/* ✅ Updated Stats Row - Open: Green, Assigned: Orange, Completed: Red */}
        <View style={styles.statsRow}>
          <View style={[styles.statItem, { backgroundColor: '#D1FAE5' }]}>
            <Text style={[styles.statNumber, { color: '#10B981' }]}>{plant.openCount}</Text>
            <Text style={styles.statLabel}>Open</Text>
          </View>
          <View style={[styles.statItem, { backgroundColor: '#FEF3C7' }]}>
            <Text style={[styles.statNumber, { color: '#F59E0B' }]}>{plant.assignedCount}</Text>
            <Text style={styles.statLabel}>Assigned</Text>
          </View>
          <View style={[styles.statItem, { backgroundColor: '#FEE2E2' }]}>
            <Text style={[styles.statNumber, { color: '#EF4444' }]}>{plant.completedCount}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
        </View>
        
        {isExpanded && (
          <ScrollView 
            style={styles.expandedScrollView}
            showsVerticalScrollIndicator={true}
            nestedScrollEnabled={true}
          >
            <View style={styles.plantDetails}>
              <View style={styles.infoGrid}>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Customer</Text>
                  <Text style={styles.infoValue}>{plant.customer || '-'}</Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Incharge</Text>
                  <Text style={styles.infoValue}>{plant.inchargeName || '-'}</Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Capacity</Text>
                  <Text style={styles.infoValue}>{formatCapacity(plant.capacity)}</Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Installed Date</Text>
                  <Text style={styles.infoValue}>{formatDate(plant.installedDate)}</Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Last Serviced</Text>
                  <Text style={styles.infoValue}>{formatDate(plant.lastServicedDate) || 'Not yet'}</Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>District</Text>
                  <Text style={styles.infoValue}>{plant.districtName || plant.district || '-'}</Text>
                </View>
              </View>
              
              {plant.services.length > 0 ? (
                <View style={styles.servicesSection}>
                  <Text style={styles.servicesTitle}>Service Requests ({plant.services.length})</Text>
                  
                  <View style={styles.servicesTableWrapper}>
                    <ServicesTableHeader />
                    {plant.services.map((service, idx) => (
                      <ServicesTableRow key={idx} service={service} index={idx} />
                    ))}
                  </View>
                </View>
              ) : (
                <View style={styles.noServicesCard}>
                  <Text style={styles.noServicesText}>No service requests yet</Text>
                </View>
              )}
            </View>
          </ScrollView>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1976d2" />
        <Text style={styles.loadingText}>Loading plants...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Plants</Text>
        <Text style={styles.headerSubtitle}>{filteredPlants.length} plants found</Text>
      </View>

      <View style={styles.searchContainer}>
        <TouchableOpacity 
          style={styles.sortBtn}
          onPress={() => setShowSortDropdown(!showSortDropdown)}
        >
          <Ionicons name="swap-vertical-outline" size={16} color="#1976d2" />
          <Text style={styles.sortBtnText}>{getSortLabel()}</Text>
        </TouchableOpacity>
        
        {showSortDropdown && (
          <View style={styles.sortMenu}>
            <TouchableOpacity style={styles.sortMenuItem} onPress={() => handleSort('name')}>
              <Text style={[styles.sortMenuText, sortType === 'name' && styles.sortMenuTextActive]}>
                Plant Name {sortType === 'name' && getSortArrow()}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.sortMenuItem} onPress={() => handleSort('customer')}>
              <Text style={[styles.sortMenuText, sortType === 'customer' && styles.sortMenuTextActive]}>
                Customer {sortType === 'customer' && getSortArrow()}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.sortMenuItem} onPress={() => handleSort('district')}>
              <Text style={[styles.sortMenuText, sortType === 'district' && styles.sortMenuTextActive]}>
                District {sortType === 'district' && getSortArrow()}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={18} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search plants..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={16} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
        data={filteredPlants}
        renderItem={({ item }) => <PlantCard plant={item} />}
        keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#1976d2']} />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No plants found</Text>
          </View>
        }
      />

      {/* Service Details Bottom Sheet */}
      <Modal
        visible={showServiceDetails}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowServiceDetails(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Service Details</Text>
              <TouchableOpacity onPress={() => setShowServiceDetails(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            {modalLoading ? (
              <View style={styles.modalLoadingContainer}>
                <ActivityIndicator size="large" color="#1976d2" />
                <Text style={styles.modalLoadingText}>Loading details...</Text>
              </View>
            ) : (
              <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
                {selectedService && serviceDetails && (
                  <>
                    <View style={styles.modalSection}>
                      <Text style={styles.modalSectionTitle}>Service Information</Text>
                      
                      <View style={styles.modalInfoRow}>
                        <Text style={styles.modalInfoLabel}>SR ID</Text>
                        <Text style={styles.modalInfoValue}>SR-{selectedService.srid}</Text>
                      </View>
                      
                      <View style={styles.modalInfoRow}>
                        <Text style={styles.modalInfoLabel}>Request Date</Text>
                        <Text style={styles.modalInfoValue}>{formatDate(selectedService.requestDate)}</Text>
                      </View>
                      
                      <View style={styles.modalInfoRow}>
                        <Text style={styles.modalInfoLabel}>Status</Text>
                        <View style={[styles.modalStatusBadge, { backgroundColor: getStatusBgColor(selectedService.status) }]}>
                          <Text style={[styles.modalStatusText, { color: getStatusColor(selectedService.status) }]}>
                            {getStatusText(selectedService.status)}
                          </Text>
                        </View>
                      </View>
                    </View>

                    <View style={styles.modalSection}>
                      <Text style={styles.modalSectionTitle}>Problem Description</Text>
                      <Text style={styles.modalProblemText}>
                        {selectedService.problem && selectedService.problem !== '-' 
                          ? selectedService.problem 
                          : '-'}
                      </Text>
                    </View>

                    <View style={styles.modalSection}>
                      <Text style={styles.modalSectionTitle}>Equipment Details</Text>
                      
                      {serviceDetails?.equipments?.length > 0 ? (
                        serviceDetails.equipments.map((eq, idx) => {
                          const serviceRateAmount = eq.serviceRate || 0;
                          const partsTotal = eq.parts?.reduce((sum, p) => sum + (p.quantity * p.rate), 0) || 0;
                          const equipmentTotal = serviceRateAmount + partsTotal;
                          
                          return (
                            <View key={idx} style={styles.modalEquipmentCard}>
                              <View style={styles.modalEquipmentHeader}>
                                <Text style={styles.modalEquipmentName}>{eq.equipmentName || '-'}</Text>
                                <View style={[styles.modalEquipmentStatus, { backgroundColor: getStatusBgColor(eq.status) }]}>
                                  <Text style={[styles.modalEquipmentStatusText, { color: getStatusColor(eq.status) }]}>
                                    {getStatusText(eq.status)}
                                  </Text>
                                </View>
                              </View>
                              
                              <View style={styles.modalEquipmentBody}>
                                <View style={styles.modalDetailRow}>
                                  <Text style={styles.modalDetailLabel}>Model Number</Text>
                                  <Text style={styles.modalDetailValue}>{eq.modelNumber || '-'}</Text>
                                </View>
                                
                                {eq.serviceTypeName && (
                                  <View style={styles.modalDetailRow}>
                                    <Text style={styles.modalDetailLabel}>Service Type</Text>
                                    <Text style={styles.modalDetailValue}>{eq.serviceTypeName}</Text>
                                  </View>
                                )}
                                
                                {eq.serviceRate && eq.serviceRate > 0 && (
                                  <View style={styles.modalDetailRow}>
                                    <Text style={styles.modalDetailLabel}>Service Rate</Text>
                                    <Text style={[styles.modalDetailValue, { color: '#1976d2', fontWeight: '500' }]}>
                                      {formatNumber(eq.serviceRate)}
                                    </Text>
                                  </View>
                                )}
                                
                                {eq.issueName && eq.issueName !== '-' && (
                                  <View style={styles.modalDetailRow}>
                                    <Text style={styles.modalDetailLabel}>Issue</Text>
                                    <Text style={styles.modalDetailValue}>{eq.issueName}</Text>
                                  </View>
                                )}
                                
                                {eq.remarks && eq.remarks !== '-' && (
                                  <View style={styles.modalDetailRow}>
                                    <Text style={styles.modalDetailLabel}>Remarks</Text>
                                    <Text style={styles.modalDetailValue}>{eq.remarks}</Text>
                                  </View>
                                )}
                                
                                {eq.serviceDate && eq.serviceDate !== '-' && (
                                  <View style={styles.modalDetailRow}>
                                    <Text style={styles.modalDetailLabel}>Service Date</Text>
                                    <Text style={styles.modalDetailValue}>{formatDateTime(eq.serviceDate)}</Text>
                                  </View>
                                )}
                                
                                {/* Assigned To for both 'A' and 'P' status */}
                                {(eq.status === 'A' || eq.status === 'P') && eq.servicedByName && (
                                  <View style={styles.modalDetailRow}>
                                    <Text style={styles.modalDetailLabel}>Assigned To</Text>
                                    <Text style={[styles.modalDetailValue, { color: '#F59E0B', fontWeight: '500' }]}>
                                      {eq.servicedByName}
                                    </Text>
                                  </View>
                                )}
                                
                                {/* Show waiting message if assigned but no name */}
                                {(eq.status === 'A' || eq.status === 'P') && !eq.servicedByName && (
                                  <View style={styles.modalDetailRow}>
                                    <Text style={styles.modalDetailLabel}>Assigned To</Text>
                                    <Text style={[styles.modalDetailValue, { color: '#94A3B8' }]}>
                                      Waiting for assignment
                                    </Text>
                                  </View>
                                )}
                                
                                {eq.status === 'C' && eq.servicedByName && (
                                  <View style={styles.modalDetailRow}>
                                    <Text style={styles.modalDetailLabel}>Completed By</Text>
                                    <Text style={[styles.modalDetailValue, { color: '#EF4444', fontWeight: '500' }]}>
                                      {eq.servicedByName}
                                    </Text>
                                  </View>
                                )}
                                
                                <TouchableOpacity 
                                  style={styles.modalDetailRow} 
                                  onPress={() => viewDocument(eq.attachFile)}
                                  disabled={!eq.attachFile || eq.attachFile === '-'}
                                >
                                  <Text style={styles.modalDetailLabel}>Document</Text>
                                  <Text style={[
                                    styles.modalDetailValue, 
                                    eq.attachFile && eq.attachFile !== '-' && styles.modalDocumentLink
                                  ]}>
                                    {eq.attachFile && eq.attachFile !== '-' ? getFileName(eq.attachFile) : '-'}
                                  </Text>
                                </TouchableOpacity>
                                
                                {/* Parts Used Table - WITH THOUSAND FORMAT */}
                                {eq.parts && eq.parts.length > 0 && (
                                  <View style={styles.modalPartsContainer}>
                                    <Text style={styles.modalPartsTitle}>Parts Used ({eq.parts.length})</Text>
                                    <View style={styles.modalPartsWrapper}>
                                      <PartsTableHeader />
                                      {eq.parts.map((part, pIdx) => (
                                        <PartsTableRow key={pIdx} part={part} index={pIdx} />
                                      ))}
                                    </View>
                                    <View style={styles.modalPartsTotal}>
                                      <Text style={styles.modalTotalLabel}>Parts Total</Text>
                                      <Text style={styles.modalTotalAmount}>
                                        {formatNumber(partsTotal)}
                                      </Text>
                                    </View>
                                  </View>
                                )}
                                
                                {/* EQUIPMENT GRAND TOTAL */}
                                {equipmentTotal > 0 && (
                                  <View style={styles.equipmentGrandTotal}>
                                    <Text style={styles.equipmentGrandTotalLabel}>Equipment Total</Text>
                                    <Text style={styles.equipmentGrandTotalAmount}>{formatNumber(equipmentTotal)}</Text>
                                  </View>
                                )}
                              </View>
                            </View>
                          );
                        })
                      ) : (
                        <View style={styles.modalNoEquipment}>
                          <Text style={styles.modalNoEquipmentText}>No equipment details available</Text>
                        </View>
                      )}
                    </View>
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
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' },
  loadingText: { marginTop: 12, fontSize: 14, color: '#64748B' },
  
  header: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12 },
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#0F172A' },
  headerSubtitle: { fontSize: 13, color: '#64748B', marginTop: 2 },
  
  searchContainer: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 12, gap: 12 },
  sortBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', gap: 6 },
  sortBtnText: { fontSize: 13, color: '#1976d2', fontWeight: '500' },
  sortMenu: { position: 'absolute', top: 50, left: 20, backgroundColor: '#FFFFFF', borderRadius: 10, elevation: 5, minWidth: 160, borderWidth: 1, borderColor: '#E2E8F0', zIndex: 100, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  sortMenuItem: { paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  sortMenuText: { fontSize: 13, color: '#64748B' },
  sortMenuTextActive: { color: '#1976d2', fontWeight: '600' },
  
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: '#E2E8F0', gap: 8 },
  searchInput: { flex: 1, fontSize: 14, color: '#0F172A', padding: 0 },
  
  listContent: { paddingHorizontal: 20, paddingBottom: 20 },
  emptyContainer: { alignItems: 'center', padding: 60 },
  emptyTitle: { fontSize: 16, color: '#94A3B8', marginTop: 12 },
  
  plantCard: { backgroundColor: '#FFFFFF', borderRadius: 16, marginBottom: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#E2E8F0', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2 },
  plantHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  plantName: { fontSize: 16, fontWeight: '600', color: '#0F172A' },
  
  statsRow: { flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 16, gap: 10 },
  statItem: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 10 },
  statNumber: { fontSize: 16, fontWeight: '700' },
  statLabel: { fontSize: 10, color: '#64748B', marginTop: 2 },
  
  expandedScrollView: { maxHeight: 500 },
  plantDetails: { paddingHorizontal: 16, paddingBottom: 16, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingVertical: 12 },
  infoItem: { flex: 1, minWidth: '45%' },
  infoLabel: { fontSize: 11, color: '#94A3B8', marginBottom: 2 },
  infoValue: { fontSize: 13, color: '#0F172A', fontWeight: '500' },
  
  servicesSection: { marginTop: 8 },
  servicesTitle: { fontSize: 14, fontWeight: '600', color: '#0F172A', marginBottom: 12 },
  
  servicesTableWrapper: {
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    marginTop: 2,
  },
  servicesTableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E2E8F0',
  },
  servicesHeaderId: {
    width: 75,
    fontSize: 10,
    fontWeight: '600',
    color: '#475569',
  },
  servicesHeaderDate: {
    width: 95,
    fontSize: 10,
    fontWeight: '600',
    color: '#475569',
  },
  servicesHeaderEq: {
    width: 60,
    fontSize: 10,
    fontWeight: '600',
    color: '#475569',
    textAlign: 'center',
  },
  servicesHeaderStatus: {
    width: 75,
    fontSize: 10,
    fontWeight: '600',
    color: '#475569',
    textAlign: 'right',
  },
  servicesHeaderAction: {
    width: 20,
  },
  servicesTableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  servicesCellId: {
    width: 75,
    fontSize: 11,
    fontWeight: '500',
    color: '#1976d2',
  },
  servicesCellDate: {
    width: 95,
    fontSize: 11,
    color: '#64748B',
  },
  servicesCellEq: {
    width: 60,
    fontSize: 11,
    textAlign: 'center',
    color: '#64748B',
  },
  servicesStatusText: {
    width: 75,
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'right',
  },
  servicesCellArrow: {
    width: 20,
    textAlign: 'center',
  },
  
  noServicesCard: { alignItems: 'center', padding: 30, backgroundColor: '#F8FAFC', borderRadius: 12 },
  noServicesText: { fontSize: 13, color: '#94A3B8' },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContainer: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '88%', overflow: 'hidden' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
  modalLoadingContainer: { padding: 60, alignItems: 'center' },
  modalLoadingText: { marginTop: 12, fontSize: 14, color: '#64748B' },
  modalContent: { padding: 20 },
  
  modalSection: { marginBottom: 24 },
  modalSectionTitle: { fontSize: 16, fontWeight: '600', color: '#0F172A', marginBottom: 14, borderLeftWidth: 3, borderLeftColor: '#1976d2', paddingLeft: 12 },
  
  modalInfoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  modalInfoLabel: { fontSize: 13, color: '#64748B', flex: 1 },
  modalInfoValue: { fontSize: 14, color: '#0F172A', fontWeight: '500', flex: 1, textAlign: 'right' },
  modalStatusBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, alignSelf: 'flex-end' },
  modalStatusText: { fontSize: 12, fontWeight: '600' },
  
  modalProblemText: { fontSize: 14, color: '#475569', lineHeight: 22, paddingVertical: 4 },
  
  modalEquipmentCard: { backgroundColor: '#F8FAFC', borderRadius: 14, marginBottom: 14, borderWidth: 1, borderColor: '#E2E8F0', overflow: 'hidden' },
  modalEquipmentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, backgroundColor: '#F1F5F9', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  modalEquipmentName: { fontSize: 14, fontWeight: '600', color: '#0F172A', flex: 1 },
  modalEquipmentStatus: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  modalEquipmentStatusText: { fontSize: 11, fontWeight: '600' },
  modalEquipmentBody: { padding: 14 },
  modalDetailRow: { flexDirection: 'row', marginBottom: 10, flexWrap: 'wrap' },
  modalDetailLabel: { width: 110, fontSize: 13, color: '#64748B' },
  modalDetailValue: { flex: 1, fontSize: 13, color: '#0F172A' },
  modalDocumentLink: { color: '#1976d2', textDecorationLine: 'underline' },
  
  modalPartsContainer: { marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#E2E8F0' },
  modalPartsTitle: { fontSize: 13, fontWeight: '600', color: '#1976d2', marginBottom: 10 },
  modalPartsWrapper: {
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    marginTop: 8,
  },
  partsTableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  partsHeaderText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  partsHeaderName: { flex: 2 },
  partsHeaderQty: { width: 50, textAlign: 'center' },
  partsHeaderRate: { width: 80, textAlign: 'right' },
  partsHeaderTotal: { width: 90, textAlign: 'right' },
  partsTableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  partsEvenRow: { backgroundColor: '#FFFFFF' },
  partsOddRow: { backgroundColor: '#F8FAFC' },
  partsCell: { fontSize: 12, color: '#1E293B' },
  partsCellName: { flex: 2 },
  partsCellQty: { width: 50, textAlign: 'center', color: '#64748B' },
  partsCellRate: { width: 80, textAlign: 'right', color: '#64748B' },
  partsCellTotal: { width: 90, textAlign: 'right', fontWeight: '600', color: '#10B981' },
  
  modalPartsTotal: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#E2E8F0' },
  modalTotalLabel: { fontSize: 13, fontWeight: '600', color: '#0F172A' },
  modalTotalAmount: { fontSize: 15, fontWeight: '700', color: '#10B981' },
  
  equipmentGrandTotal: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginTop: 12, 
    paddingTop: 10, 
    borderTopWidth: 2, 
    borderTopColor: '#1976d2', 
    backgroundColor: '#E3F2FD', 
    paddingHorizontal: 10, 
    paddingBottom: 8, 
    borderRadius: 6 
  },
  equipmentGrandTotalLabel: { fontSize: 13, fontWeight: 'bold', color: '#1565C0' },
  equipmentGrandTotalAmount: { fontSize: 15, fontWeight: 'bold', color: '#2e7d32' },
  
  modalNoEquipment: { padding: 40, alignItems: 'center' },
  modalNoEquipmentText: { fontSize: 14, color: '#94A3B8' },
});

export { AdminPlantsScreen };