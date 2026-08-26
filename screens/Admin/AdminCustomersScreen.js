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
  Dimensions,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';

const { width, height } = Dimensions.get('window');

const API_BASE = 'http://192.168.29.223:2927/api';
//const API_BASE = 'http://10.196.32.8:2927/api';

export default function AdminCustomersScreen({ navigation }) {
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('all');
  const [districts, setDistricts] = useState([]);
  const [showDistrictDropdown, setShowDistrictDropdown] = useState(false);
  
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showPlantModal, setShowPlantModal] = useState(false);
  const [showServiceModal, setShowServiceModal] = useState(false);
  
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedPlant, setSelectedPlant] = useState(null);
  const [selectedService, setSelectedService] = useState(null);
  const [customerPlants, setCustomerPlants] = useState([]);
  const [plantServices, setPlantServices] = useState([]);
  const [serviceDetails, setServiceDetails] = useState(null);

  useEffect(() => {
    loadCustomers();
    loadDistricts();
  }, []);

  useEffect(() => {
    filterCustomers();
  }, [customers, searchQuery, selectedDistrict]);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/admin/customers`);
      if (response.data.status === 'success') {
        const customerData = response.data.customers || [];
        setCustomers(customerData);
      }
    } catch (error) {
      console.error('Error loading customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDistricts = async () => {
    try {
      const response = await axios.get(`${API_BASE}/admin/districts`);
      if (response.data.status === 'success') {
        setDistricts(response.data.districts || []);
      }
    } catch (error) {
      console.error('Error loading districts:', error);
    }
  };

  const loadCustomerPlants = async (customerId) => {
    try {
      const response = await axios.get(`${API_BASE}/admin/plants/by-customer/${customerId}`);
      if (response.data.status === 'success') {
        setCustomerPlants(response.data.plants || []);
      }
    } catch (error) {
      console.error('Error loading customer plants:', error);
      setCustomerPlants([]);
    }
  };

  const loadPlantServices = async (plantId) => {
    try {
      const response = await axios.get(`${API_BASE}/admin/services/by-plant/${plantId}`);
      if (response.data.status === 'success') {
        setPlantServices(response.data.services || []);
      }
    } catch (error) {
      console.error('Error loading plant services:', error);
      setPlantServices([]);
    }
  };

  const loadServiceDetails = async (srid) => {
    try {
      const response = await axios.get(`${API_BASE}/admin/services/${srid}`);
      if (response.data.status === 'success') {
        setServiceDetails(response.data);
      }
    } catch (error) {
      console.error('Error loading service details:', error);
      setServiceDetails(null);
    }
  };

  const filterCustomers = () => {
    let filtered = [...customers];
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(customer =>
        (customer.name && customer.name.toLowerCase().includes(query)) ||
        (customer.phone && customer.phone.toLowerCase().includes(query)) ||
        (customer.districtName && customer.districtName.toLowerCase().includes(query))
      );
    }
    
    if (selectedDistrict !== 'all') {
      filtered = filtered.filter(customer => customer.districtCode === selectedDistrict);
    }
    
    setFilteredCustomers(filtered);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCustomers();
    setRefreshing(false);
  };

  const handleCustomerClick = async (customer) => {
    setSelectedCustomer(customer);
    await loadCustomerPlants(customer.id);
    setShowCustomerModal(true);
  };

  const handlePlantClick = async (plant) => {
    setSelectedPlant(plant);
    await loadPlantServices(plant.id);
    setShowPlantModal(true);
  };

  const handleServiceClick = async (service) => {
    setSelectedService(service);
    await loadServiceDetails(service.srid);
    setShowServiceModal(true);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const formatCapacity = (capacity) => {
    if (!capacity) return '-';
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

  const getDistrictsWithPlants = () => {
    const districtMap = new Map();
    customers.forEach(customer => {
      if (customer.districtCode && customer.districtName && (customer.plantCount || 0) > 0) {
        if (!districtMap.has(customer.districtCode)) {
          districtMap.set(customer.districtCode, {
            code: customer.districtCode,
            name: customer.districtName
          });
        }
      }
    });
    return Array.from(districtMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  };

  // Service Table Header
  const ServiceTableHeader = () => (
    <View style={styles.serviceTableHeader}>
      <Text style={[styles.serviceHeaderText, styles.serviceHeaderId]}>SR ID</Text>
      <Text style={[styles.serviceHeaderText, styles.serviceHeaderDate]}>Request Date</Text>
      <Text style={[styles.serviceHeaderText, styles.serviceHeaderEq]}>Equipment</Text>
      <Text style={[styles.serviceHeaderText, styles.serviceHeaderStatus]}>Status</Text>
      <View style={styles.serviceHeaderAction} />
    </View>
  );

  // Service Table Row
  const ServiceTableRow = ({ service }) => (
    <TouchableOpacity 
      style={styles.serviceTableRow}
      onPress={() => handleServiceClick(service)}
      activeOpacity={0.7}
    >
      <Text style={styles.serviceCellId}>SR-{service.srid}</Text>
      <Text style={styles.serviceCellDate}>{formatDate(service.requestDate)}</Text>
      <Text style={styles.serviceCellEq}>{service.equipmentCount || 0}</Text>
      <Text style={[styles.serviceStatusText, { color: getStatusColor(service.status) }]}>
        {getStatusText(service.status)}
      </Text>
      <Ionicons name="chevron-forward" size={14} color="#CBD5E1" />
    </TouchableOpacity>
  );

  const TableRow = ({ item, index }) => (
    <TouchableOpacity 
      style={[styles.tableRow, index % 2 === 0 ? styles.evenRow : styles.oddRow]}
      onPress={() => handleCustomerClick(item)}
      activeOpacity={0.7}
    >
      <Text style={[styles.cell, styles.cellIndex]}>{index + 1}</Text>
      <View style={styles.cellCustomer}>
        <Text style={styles.customerName}>{item.name || '-'}</Text>
        <Text style={styles.customerPhone}>{item.phone || '-'}</Text>
      </View>
      <Text style={[styles.cell, styles.cellDistrict]}>{item.districtName || '-'}</Text>
      <View style={styles.cellPlants}>
        <Text style={styles.plantCount}>{item.plantCount || 0}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
    </TouchableOpacity>
  );

  const TableHeader = () => (
    <View style={styles.tableHeader}>
      <Text style={[styles.headerText, styles.headerIndex]}>S.No</Text>
      <Text style={[styles.headerText, styles.headerCustomer]}>Customer Name</Text>
      <Text style={[styles.headerText, styles.headerDistrict]}>District</Text>
      <Text style={[styles.headerText, styles.headerPlants]}>Plants</Text>
      <View style={styles.headerAction} />
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1976d2" />
        <Text style={styles.loadingText}>Loading customers...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Customers</Text>
        <Text style={styles.headerCount}>{filteredCustomers.length} customers</Text>
      </View>

      {/* Filter Row */}
      <View style={styles.filterRow}>
        <View style={styles.districtWrapper}>
          <TouchableOpacity 
            style={styles.districtSelector}
            onPress={() => setShowDistrictDropdown(!showDistrictDropdown)}
          >
            <Text style={styles.districtSelectorText}>
              {selectedDistrict !== 'all' 
                ? districts.find(d => d.code === selectedDistrict)?.name || 'All Districts'
                : 'All Districts'}
            </Text>
            <Ionicons name="chevron-down" size={14} color="#6B7280" />
          </TouchableOpacity>
          
          {showDistrictDropdown && (
            <View style={styles.dropdownMenu}>
              <ScrollView 
                style={styles.dropdownScrollView}
                showsVerticalScrollIndicator={true}
              >
                <TouchableOpacity 
                  style={[styles.dropdownItem, selectedDistrict === 'all' && styles.dropdownItemActive]}
                  onPress={() => { setSelectedDistrict('all'); setShowDistrictDropdown(false); }}
                >
                  <Text style={[styles.dropdownText, selectedDistrict === 'all' && styles.dropdownTextActive]}>All Districts</Text>
                  <View style={styles.dropdownCount}>
                    <Text style={styles.dropdownCountText}>{customers.length}</Text>
                  </View>
                </TouchableOpacity>
                {getDistrictsWithPlants().map(district => (
                  <TouchableOpacity 
                    key={district.code}
                    style={[styles.dropdownItem, selectedDistrict === district.code && styles.dropdownItemActive]}
                    onPress={() => { setSelectedDistrict(district.code); setShowDistrictDropdown(false); }}
                  >
                    <Text style={[styles.dropdownText, selectedDistrict === district.code && styles.dropdownTextActive]}>{district.name}</Text>
                    <View style={styles.dropdownCount}>
                      <Text style={styles.dropdownCountText}>
                        {customers.filter(c => c.districtCode === district.code && (c.plantCount || 0) > 0).length}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search customers..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={16} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Table */}
      <TableHeader />
      <FlatList
        data={filteredCustomers}
        renderItem={({ item, index }) => <TableRow item={item} index={index} />}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#1976d2']} />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={56} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>No customers found</Text>
            <Text style={styles.emptySubtitle}>Try adjusting your search or filter</Text>
          </View>
        }
      />

      {/* Customer Detail Modal */}
      <Modal visible={showCustomerModal} transparent={true} animationType="slide" onRequestClose={() => setShowCustomerModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Customer Details</Text>
              <TouchableOpacity onPress={() => setShowCustomerModal(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {selectedCustomer && (
                <>
                  <View style={styles.profileCard}>
                    <Text style={styles.profileName}>{selectedCustomer.name}</Text>
                    
                    <View style={styles.profileDetail}>
                      <Text style={styles.profileLabel}>Phone</Text>
                      <Text style={styles.profileValue}>{selectedCustomer.phone || '-'}</Text>
                    </View>
                    
                    <View style={styles.profileDetail}>
                      <Text style={styles.profileLabel}>Email</Text>
                      <Text style={styles.profileValue}>{selectedCustomer.email || '-'}</Text>
                    </View>
                    
                    <View style={styles.profileDetail}>
                      <Text style={styles.profileLabel}>Address</Text>
                      <Text style={styles.profileValue}>
                        {[selectedCustomer.address1, selectedCustomer.address2].filter(Boolean).join(', ') || '-'}
                      </Text>
                    </View>
                    
                    <View style={styles.profileDetail}>
                      <Text style={styles.profileLabel}>District</Text>
                      <Text style={styles.profileValue}>{selectedCustomer.districtName || '-'}</Text>
                    </View>
                    
                    <View style={styles.profileDetail}>
                      <Text style={styles.profileLabel}>State</Text>
                      <Text style={styles.profileValue}>{selectedCustomer.stateName || '-'}</Text>
                    </View>
                  </View>

                  <Text style={styles.sectionTitle}>Plants ({customerPlants.length})</Text>
                  {customerPlants.length > 0 ? (
                    customerPlants.map((plant, idx) => (
                      <TouchableOpacity key={idx} style={styles.plantItem} onPress={() => {
                        setShowCustomerModal(false);
                        handlePlantClick(plant);
                      }}>
                        <View style={styles.plantContent}>
                          <Text style={styles.plantName}>{plant.name}</Text>
                          <Text style={styles.plantMeta}>
                            {formatCapacity(plant.capacity)} • {plant.districtName || '-'}
                          </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
                      </TouchableOpacity>
                    ))
                  ) : (
                    <View style={styles.emptyCard}>
                      <Text style={styles.emptyCardText}>No plants registered</Text>
                    </View>
                  )}
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Plant Detail Modal */}
      <Modal visible={showPlantModal} transparent={true} animationType="slide" onRequestClose={() => setShowPlantModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Plant Details</Text>
              <TouchableOpacity onPress={() => setShowPlantModal(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {selectedPlant && (
                <>
                  <View style={styles.detailCard}>
                    <Text style={styles.detailTitle}>{selectedPlant.name}</Text>
                    
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>District</Text>
                      <Text style={styles.detailValue}>{selectedPlant.districtName || '-'}</Text>
                    </View>
                    
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Capacity</Text>
                      <Text style={styles.detailValue}>{formatCapacity(selectedPlant.capacity)}</Text>
                    </View>
                    
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Installed Date</Text>
                      <Text style={styles.detailValue}>{formatDate(selectedPlant.installedDate)}</Text>
                    </View>
                    
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Incharge</Text>
                      <Text style={styles.detailValue}>{selectedPlant.inchargeName || '-'}</Text>
                    </View>
                  </View>

                  <Text style={styles.sectionTitle}>Services ({plantServices.length})</Text>
                  
                  <View style={styles.serviceTableWrapper}>
                    <ServiceTableHeader />
                    {plantServices.length > 0 ? (
                      plantServices.map((service, idx) => (
                        <ServiceTableRow key={idx} service={service} />
                      ))
                    ) : (
                      <View style={styles.emptyCard}>
                        <Text style={styles.emptyCardText}>No services found</Text>
                      </View>
                    )}
                  </View>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Service Detail Modal */}
      <Modal visible={showServiceModal} transparent={true} animationType="slide" onRequestClose={() => setShowServiceModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, styles.serviceModalLarge]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Service Details</Text>
              <TouchableOpacity onPress={() => setShowServiceModal(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {selectedService && serviceDetails && (
                <>
                  <View style={styles.infoCard}>
                    <Text style={styles.infoTitle}>Service Information</Text>
                    
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>SR ID</Text>
                      <Text style={styles.infoValue}>SR-{selectedService.srid}</Text>
                    </View>
                    
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Request Date</Text>
                      <Text style={styles.infoValue}>{formatDate(selectedService.requestDate)}</Text>
                    </View>
                    
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Status</Text>
                      {/* ✅ Updated Status Color */}
                      <Text style={[styles.infoValue, { color: getStatusColor(selectedService.status) }]}>
                        {getStatusText(selectedService.status)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.infoCard}>
                    <Text style={styles.infoTitle}>Problem Description</Text>
                    <Text style={styles.problemDesc}>{selectedService.problem && selectedService.problem !== '-' ? selectedService.problem : '-'}</Text>
                  </View>

                  <Text style={styles.sectionTitle}>Equipment Details</Text>
                  {serviceDetails?.equipments?.length > 0 ? (
                    serviceDetails.equipments.map((eq, idx) => (
                      <View key={idx} style={styles.equipmentCard}>
                        <View style={styles.equipmentHeader}>
                          <Text style={styles.equipmentName}>{eq.equipmentName || '-'}</Text>
                          {/* ✅ Updated Status Badge */}
                          <View style={[styles.equipBadge, { backgroundColor: getStatusBgColor(eq.status) }]}>
                            <Text style={[styles.equipBadgeText, { color: getStatusColor(eq.status) }]}>
                              {getStatusText(eq.status)}
                            </Text>
                          </View>
                        </View>
                        <View style={styles.equipmentBody}>
                          <View style={styles.equipRow}>
                            <Text style={styles.equipLabel}>Model Number</Text>
                            <Text style={styles.equipValue}>{eq.modelNumber || '-'}</Text>
                          </View>
                          {eq.serviceTypeName && (
                            <View style={styles.equipRow}>
                              <Text style={styles.equipLabel}>Service Type</Text>
                              <Text style={styles.equipValue}>{eq.serviceTypeName}</Text>
                            </View>
                          )}
                          {eq.issueName && eq.issueName !== '-' && (
                            <View style={styles.equipRow}>
                              <Text style={styles.equipLabel}>Issue</Text>
                              <Text style={styles.equipValue}>{eq.issueName}</Text>
                            </View>
                          )}
                          {eq.remarks && eq.remarks !== '-' && (
                            <View style={styles.equipRow}>
                              <Text style={styles.equipLabel}>Remarks</Text>
                              <Text style={styles.equipValue}>{eq.remarks}</Text>
                            </View>
                          )}
                          {eq.serviceDate && (
                            <View style={styles.equipRow}>
                              <Text style={styles.equipLabel}>Service Date</Text>
                              <Text style={styles.equipValue}>{formatDateTime(eq.serviceDate)}</Text>
                            </View>
                          )}
                          {/* Assigned To - Orange */}
                          {(eq.status === 'A' || eq.status === 'P') && eq.servicedByName && (
                            <View style={styles.equipRow}>
                              <Text style={styles.equipLabel}>Assigned To</Text>
                              <Text style={[styles.equipValue, { color: '#F59E0B', fontWeight: '600' }]}>{eq.servicedByName}</Text>
                            </View>
                          )}
                          {/* Completed By - Red */}
                          {eq.status === 'C' && eq.servicedByName && (
                            <View style={styles.equipRow}>
                              <Text style={styles.equipLabel}>Completed By</Text>
                              <Text style={[styles.equipValue, { color: '#EF4444', fontWeight: '600' }]}>{eq.servicedByName}</Text>
                            </View>
                          )}
                        </View>
                      </View>
                    ))
                  ) : (
                    <View style={styles.emptyCard}>
                      <Text style={styles.emptyCardText}>No equipment details available</Text>
                    </View>
                  )}
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748B',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0F172A',
  },
  headerCount: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 16,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  districtWrapper: {
    position: 'relative',
    zIndex: 100,
  },
  districtSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minWidth: 120,
    gap: 8,
  },
  districtSelectorText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1E293B',
  },
  dropdownMenu: {
    position: 'absolute',
    top: 44,
    left: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    zIndex: 200,
    elevation: 5,
    minWidth: 160,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  dropdownScrollView: {
    maxHeight: 250,
  },
  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  dropdownItemActive: {
    backgroundColor: '#E0E7FF',
  },
  dropdownText: {
    fontSize: 13,
    color: '#1E293B',
  },
  dropdownTextActive: {
    color: '#1976d2',
    fontWeight: '600',
  },
  dropdownCount: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  dropdownCountText: {
    fontSize: 11,
    color: '#64748B',
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1E293B',
    padding: 0,
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1976d2',
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  headerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  headerIndex: {
    width: 50,
  },
  headerCustomer: {
    flex: 2,
  },
  headerDistrict: {
    width: 100,
    flex:1,
     textAlign: 'center',
  },
  headerPlants: {
    width: 70,
    textAlign: 'right',
     
  },
  headerAction: {
    width: 30,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  evenRow: {
    backgroundColor: '#FFFFFF',
  },
  oddRow: {
    backgroundColor: '#F8FAFC',
  },
  cell: {
    fontSize: 14,
  },
  cellIndex: {
    width: 50,
    color: '#94A3B8',
    fontWeight: '500',
  },
  cellCustomer: {
    flex: 2,
  },
  cellDistrict: {
    width: 100,
    color: '#475569',
    flex:1,
    alignItems: 'center'
  },
  cellPlants: {
    width: 70,
    alignItems: 'center',
  },
  customerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 4,
  },
  customerPhone: {
    fontSize: 12,
    color: '#64748B',
  },
  plantCount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1976d2',
  },
  listContent: {
    paddingBottom: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#64748B',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: height * 0.88,
  },
  serviceModalLarge: {
    maxHeight: height * 0.94,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalBody: {
    padding: 20,
  },
  profileCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 16,
  },
  profileDetail: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  profileLabel: {
    width: 80,
    fontSize: 13,
    color: '#64748B',
  },
  profileValue: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 14,
    marginTop: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#1976d2',
    paddingLeft: 12,
  },
  plantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  plantContent: {
    flex: 1,
  },
  plantName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 4,
  },
  plantMeta: {
    fontSize: 12,
    color: '#64748B',
  },
  serviceTableWrapper: {
    marginTop: 4,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  serviceTableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  serviceHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  serviceHeaderId: {
    width: 85,
  },
  serviceHeaderDate: {
    width: 105,
  },
  serviceHeaderEq: {
    width: 70,
    textAlign: 'center',
  },
  serviceHeaderStatus: {
    width: 95,
    textAlign: 'center',
  },
  serviceHeaderAction: {
    width: 30,
  },
  serviceTableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  serviceCellId: {
    width: 85,
    fontSize: 13,
    fontWeight: '500',
    color: '#1976d2',
  },
  serviceCellDate: {
    width: 105,
    fontSize: 13,
    color: '#64748B',
  },
  serviceCellEq: {
    width: 70,
    fontSize: 13,
    textAlign: 'center',
    color: '#64748B',
  },
  serviceStatusText: {
    width: 95,
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
  detailCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
  },
  detailTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 14,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  detailLabel: {
    width: 110,
    fontSize: 13,
    color: '#64748B',
  },
  detailValue: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '500',
  },
  infoCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#1976d2',
    paddingLeft: 10,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  infoLabel: {
    width: 110,
    fontSize: 13,
    color: '#64748B',
  },
  infoValue: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '500',
  },
  problemDesc: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 20,
  },
  equipmentCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  equipmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F1F5F9',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  equipmentName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  equipBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 20,
  },
  equipBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  equipmentBody: {
    padding: 12,
  },
  equipRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  equipLabel: {
    width: 110,
    fontSize: 12,
    color: '#64748B',
  },
  equipValue: {
    flex: 1,
    fontSize: 12,
    color: '#0F172A',
  },
  emptyCard: {
    padding: 30,
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
  },
  emptyCardText: {
    fontSize: 13,
    color: '#94A3B8',
  },
});