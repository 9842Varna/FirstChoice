import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';

const API_BASE = 'http://192.168.29.223:2927/api';
//const API_BASE = 'http://10.196.32.8:2927/api';

export default function CreateServiceScreen({ user, onBack, onSuccess }) {
  const [plants, setPlants] = useState([]);
  const [allPlants, setAllPlants] = useState([]);
  const [equipmentList, setEquipmentList] = useState([]);
  const [availableEquipment, setAvailableEquipment] = useState([]);
  const [equipmentIssues, setEquipmentIssues] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const [selectedPlant, setSelectedPlant] = useState(null);
  const [problem, setProblem] = useState('');
  
  const [showPlantDropdown, setShowPlantDropdown] = useState(false);
  const [showEquipmentDropdown, setShowEquipmentDropdown] = useState(false);
  const [showIssueDropdown, setShowIssueDropdown] = useState(false);
  
  const [selectedEquipment, setSelectedEquipment] = useState(null);
  const [selectedIssue, setSelectedIssue] = useState(null);
  
  const getTodayDate = () => {
    const today = new Date();
    const day = today.getDate().toString().padStart(2, '0');
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const year = today.getFullYear();
    return day + '/' + month + '/' + year;
  };
  
  const requestDate = getTodayDate();

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const plantsRes = await axios.get(API_BASE + '/admin/plants');
      if (plantsRes.data.status === 'success') {
        setAllPlants(plantsRes.data.plants || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadEquipmentByPlant = async (plantId) => {
    try {
      const response = await axios.get(API_BASE + '/admin/equipment/by-plant/' + plantId);
      if (response.data.status === 'success') {
        setAvailableEquipment(response.data.equipment || []);
      }
    } catch (error) {
      console.error('Error loading equipment:', error);
    }
  };

  const loadIssuesByEquipment = async (equipmentId) => {
    try {
      const response = await axios.get(API_BASE + '/admin/issues/by-equipment/' + equipmentId);
      if (response.data.status === 'success') {
        setEquipmentIssues(response.data.issues || []);
      } else {
        setEquipmentIssues([]);
      }
    } catch (error) {
      console.error('Error loading equipment issues:', error);
      setEquipmentIssues([]);
    }
  };

  const isEquipmentAdded = (equipmentId) => {
    return equipmentList.some(eq => eq.id === equipmentId);
  };

  const addEquipment = () => {
    if (!selectedEquipment) {
      Alert.alert('Error', 'Please select equipment');
      return;
    }
    if (!selectedIssue) {
      Alert.alert('Error', 'Please select issue');
      return;
    }
    
    if (isEquipmentAdded(selectedEquipment.id)) {
      Alert.alert('Duplicate Equipment', selectedEquipment.name + ' is already added to this service request.');
      return;
    }
    
    const newEquipmentItem = {
      id: selectedEquipment.id,
      name: selectedEquipment.name,
      model: selectedEquipment.model || '-',
      issueId: selectedIssue.id,
      issueName: selectedIssue.name,
    };
    
    setEquipmentList([...equipmentList, newEquipmentItem]);
    setSelectedEquipment(null);
    setSelectedIssue(null);
    setEquipmentIssues([]);
  };

  const removeEquipment = (index) => {
    Alert.alert('Remove Equipment', 'Are you sure you want to remove this equipment?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => {
          const newList = [...equipmentList];
          newList.splice(index, 1);
          setEquipmentList(newList);
        }
      }
    ]);
  };

  const handleSubmit = async () => {
    if (!selectedPlant) {
      Alert.alert('Error', 'Please select a plant');
      return;
    }
    if (equipmentList.length === 0) {
      Alert.alert('Error', 'Please add at least one equipment');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        plantId: selectedPlant.id,
        requestDate: new Date().toISOString().split('T')[0],
        problem: problem,
        equipments: equipmentList.map(eq => ({
          equipmentId: eq.id,
          issueId: eq.issueId,
        })),
        receivedBy: user.id,
      };

      const response = await axios.post(API_BASE + '/admin/service/create', payload);
      
      if (response.data.status === 'success') {
        Alert.alert('Success', 'Service created successfully!', [
          { text: 'OK', onPress: () => {
            setSelectedPlant(null);
            setEquipmentList([]);
            setProblem('');
            setSelectedEquipment(null);
            setSelectedIssue(null);
            setEquipmentIssues([]);
            if (onSuccess) onSuccess();
            onBack();
          }}
        ]);
      } else {
        Alert.alert('Error', response.data.message || 'Failed to create service');
      }
    } catch (error) {
      console.error('Error creating service:', error);
      Alert.alert('Error', 'Failed to create service');
    } finally {
      setSubmitting(false);
    }
  };

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
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1976d2" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Service</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Request Date */}
        <View style={styles.section}>
          <Text style={styles.label}>Request Date</Text>
          <View style={styles.dateDisplay}>
            <Ionicons name="calendar-outline" size={20} color="#666" />
            <Text style={styles.dateText}>{requestDate}</Text>
          </View>
        </View>

        {/* Plant Selection */}
        <View style={styles.section}>
          <Text style={styles.label}>Plant *</Text>
          <TouchableOpacity 
            style={styles.dropdown}
            onPress={() => setShowPlantDropdown(!showPlantDropdown)}
          >
            <Text style={selectedPlant ? styles.dropdownText : styles.dropdownPlaceholder}>
              {selectedPlant ? selectedPlant.name : 'Select Plant'}
            </Text>
            <Ionicons name={showPlantDropdown ? "chevron-up" : "chevron-down"} size={20} color="#666" />
          </TouchableOpacity>
          
          {showPlantDropdown && (
            <View style={styles.dropdownList}>
              <ScrollView nestedScrollEnabled={true} style={{ maxHeight: 200 }}>
                {allPlants.map(plant => (
                  <TouchableOpacity
                    key={plant.id}
                    style={styles.dropdownItem}
                    onPress={() => {
                      setSelectedPlant(plant);
                      setEquipmentList([]);
                      setAvailableEquipment([]);
                      setSelectedEquipment(null);
                      setSelectedIssue(null);
                      setEquipmentIssues([]);
                      loadEquipmentByPlant(plant.id);
                      setShowPlantDropdown(false);
                    }}
                  >
                    <Text style={styles.dropdownItemText}>{plant.name}</Text>
                    <Text style={styles.dropdownItemSub}>📍 {plant.districtName}</Text>
                  </TouchableOpacity>
                ))}
                {allPlants.length === 0 && (
                  <View style={styles.dropdownItem}>
                    <Text style={styles.dropdownItemText}>No plants found</Text>
                  </View>
                )}
              </ScrollView>
            </View>
          )}
        </View>

        {/* Equipment List */}
        <View style={styles.section}>
          <Text style={styles.label}>Equipment List *</Text>
          
          {equipmentList.map((eq, index) => (
            <View key={index} style={styles.equipmentCard}>
              <View style={styles.equipmentInfo}>
                <Text style={styles.equipmentName}>{eq.name}</Text>
                <Text style={styles.equipmentModel}>Model: {eq.model}</Text>
                <Text style={styles.equipmentIssue}>Issue: {eq.issueName}</Text>
              </View>
              <TouchableOpacity onPress={() => removeEquipment(index)}>
                <Ionicons name="trash-outline" size={22} color="#dc3545" />
              </TouchableOpacity>
            </View>
          ))}

          {/* Add Equipment Form */}
          {selectedPlant && (
            <View style={styles.addEquipmentCard}>
              <Text style={styles.addCardTitle}>Add Equipment</Text>
              
              {/* Equipment Selection */}
              <TouchableOpacity 
                style={styles.dropdown}
                onPress={() => setShowEquipmentDropdown(!showEquipmentDropdown)}
              >
                <Text style={selectedEquipment ? styles.dropdownText : styles.dropdownPlaceholder}>
                  {selectedEquipment ? selectedEquipment.name + ' (' + (selectedEquipment.model || 'No Model') + ')' : 'Select Equipment'}
                </Text>
                <Ionicons name={showEquipmentDropdown ? "chevron-up" : "chevron-down"} size={20} color="#666" />
              </TouchableOpacity>
              
              {showEquipmentDropdown && (
                <View style={styles.dropdownList}>
                  <ScrollView nestedScrollEnabled={true} style={{ maxHeight: 150 }}>
                    {availableEquipment.map(eq => {
                      const alreadyAdded = isEquipmentAdded(eq.id);
                      return (
                        <TouchableOpacity
                          key={eq.id}
                          style={[styles.dropdownItem, alreadyAdded && styles.disabledItem]}
                          onPress={() => {
                            if (alreadyAdded) {
                              Alert.alert('Duplicate Equipment', eq.name + ' is already added to this service request.');
                              return;
                            }
                            setSelectedEquipment(eq);
                            setSelectedIssue(null);
                            setEquipmentIssues([]);
                            loadIssuesByEquipment(eq.id);
                            setShowEquipmentDropdown(false);
                          }}
                        >
                          <Text style={[styles.dropdownItemText, alreadyAdded && styles.disabledText]}>
                            {eq.name}
                          </Text>
                          <Text style={styles.dropdownItemSub}>{eq.model || 'No Model'}</Text>
                          {alreadyAdded && (
                            <View style={styles.addedBadge}>
                              <Text style={styles.addedBadgeText}>Added</Text>
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                    {availableEquipment.length === 0 && (
                      <View style={styles.dropdownItem}>
                        <Text style={styles.dropdownItemText}>No equipment found</Text>
                      </View>
                    )}
                  </ScrollView>
                </View>
              )}
              
              {/* Issue Selection */}
              {selectedEquipment && (
                <TouchableOpacity 
                  style={[styles.dropdown, { marginTop: 12 }]}
                  onPress={() => setShowIssueDropdown(!showIssueDropdown)}
                >
                  <Text style={selectedIssue ? styles.dropdownText : styles.dropdownPlaceholder}>
                    {selectedIssue ? selectedIssue.name : 'Select Issue'}
                  </Text>
                  <Ionicons name={showIssueDropdown ? "chevron-up" : "chevron-down"} size={20} color="#666" />
                </TouchableOpacity>
              )}
              
              {showIssueDropdown && selectedEquipment && (
                <View style={styles.dropdownList}>
                  <ScrollView nestedScrollEnabled={true} style={{ maxHeight: 150 }}>
                    {equipmentIssues.length > 0 ? (
                      equipmentIssues.map(issue => (
                        <TouchableOpacity
                          key={issue.id}
                          style={styles.dropdownItem}
                          onPress={() => {
                            setSelectedIssue(issue);
                            setShowIssueDropdown(false);
                          }}
                        >
                          <Text style={styles.dropdownItemText}>{issue.name}</Text>
                        </TouchableOpacity>
                      ))
                    ) : (
                      <View style={styles.dropdownItem}>
                        <Text style={styles.dropdownItemText}>No issues available for this equipment</Text>
                      </View>
                    )}
                  </ScrollView>
                </View>
              )}
              
              <TouchableOpacity 
                style={[styles.addBtn, (!selectedEquipment || !selectedIssue) && styles.disabledBtn]} 
                onPress={addEquipment}
                disabled={!selectedEquipment || !selectedIssue}
              >
                <Ionicons name="add-circle-outline" size={20} color="#fff" />
                <Text style={styles.addBtnText}>Add Equipment</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Problem Description */}
        <View style={styles.section}>
          <Text style={styles.label}>Problem Description</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Describe the issue..."
            value={problem}
            onChangeText={setProblem}
            multiline={true}
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Submit Button */}
        <TouchableOpacity 
          style={[styles.submitBtn, submitting && styles.disabledBtn]} 
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitBtnText}>Create Service Request</Text>
          )}
        </TouchableOpacity>
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
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  dateDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    gap: 10,
  },
  dateText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  dropdownText: {
    fontSize: 14,
    color: '#333',
  },
  dropdownPlaceholder: {
    fontSize: 14,
    color: '#999',
  },
  dropdownList: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    marginTop: 4,
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dropdownItemText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    flex: 1,
  },
  dropdownItemSub: {
    fontSize: 11,
    color: '#999',
    marginLeft: 8,
  },
  textArea: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#333',
    minHeight: 100,
  },
  equipmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  equipmentInfo: {
    flex: 1,
  },
  equipmentName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  equipmentModel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  equipmentIssue: {
    fontSize: 12,
    color: '#FF9800',
    marginTop: 2,
  },
  addEquipmentCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed',
    marginTop: 8,
  },
  addCardTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1976d2',
    marginBottom: 12,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1976d2',
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 12,
    gap: 8,
  },
  addBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  submitBtn: {
    backgroundColor: '#1976d2',
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  disabledBtn: {
    opacity: 0.6,
  },
  disabledItem: {
    opacity: 0.5,
    backgroundColor: '#f9f9f9',
  },
  disabledText: {
    color: '#999',
  },
  addedBadge: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8,
  },
  addedBadgeText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: 'bold',
  },
});