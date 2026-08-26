import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  StatusBar,
  Image,
  ActivityIndicator,
  TextInput,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import * as ImagePicker from 'expo-image-picker';

//const API_BASE = 'http://10.196.32.8:2927/api';
const API_BASE = 'http://192.168.29.223:2927/api';

export default function ProfileScreen({ user, onLogout, hideHeader = true }) {
  const [employeeData, setEmployeeData] = useState(null);
  const [profileImage, setProfileImage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editData, setEditData] = useState({
    name: '',
    gender: '',
    phone: '',
    email: '',
    address1: '',
    address2: '',
    talukName: '',
  });

  useEffect(() => {
    loadEmployeeProfile();
  }, []);

  const loadEmployeeProfile = async () => {
    try {
      let empId = user?.id;
      if (!empId) {
        const empData = await AsyncStorage.getItem('employeeData');
        if (empData) {
          const data = JSON.parse(empData);
          empId = data.id;
        }
      }
      
      if (empId) {
        const response = await axios.get(`${API_BASE}/profile/${empId}`);
        setEmployeeData(response.data);
        setEditData({
          name: response.data.name || '',
          gender: response.data.gender || '',
          email: response.data.email || '',
          phone: response.data.phone || '',
          address1: response.data.address1 || '',
          address2: response.data.address2 || '',
          talukName: response.data.talukName || '',
        });
        
        loadProfileImage(empId);
      }
    } catch (e) {
      console.error('Error loading profile:', e);
    } finally {
      setLoading(false);
    }
  };

  const loadProfileImage = async (empId) => {
    try {
      const imageUrl = `${API_BASE}/profile/image/${empId}?t=${Date.now()}`;
      setProfileImage(imageUrl);
    } catch (e) {
      console.error('Error loading image:', e);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Need camera roll permission to upload image');
      return;
    }
    
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });
    
    if (!result.canceled) {
      uploadProfileImage(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Need camera permission to take photo');
      return;
    }
    
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });
    
    if (!result.canceled) {
      uploadProfileImage(result.assets[0].uri);
    }
  };

  const deleteProfileImage = async () => {
    Alert.alert(
      'Delete Photo',
      'Are you sure you want to delete your profile picture?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setUploadingImage(true);
            try {
              let empId = user?.id;
              if (!empId) {
                const empData = await AsyncStorage.getItem('employeeData');
                if (empData) {
                  empId = JSON.parse(empData).id;
                }
              }
              
              const response = await axios.post(`${API_BASE}/profile/delete-image`, { empId });
              
              if (response.data.status === 'success') {
                setProfileImage(null);
                Alert.alert('Success', 'Profile picture deleted!');
              }
            } catch (e) {
              Alert.alert('Error', 'Failed to delete image');
            } finally {
              setUploadingImage(false);
            }
          }
        }
      ]
    );
  };

  const uploadProfileImage = async (uri) => {
    setUploadingImage(true);
    try {
      let empId = user?.id;
      if (!empId) {
        const empData = await AsyncStorage.getItem('employeeData');
        if (empData) {
          empId = JSON.parse(empData).id;
        }
      }
      
      const formData = new FormData();
      const filename = uri.split('/').pop();
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';
      
      formData.append('file', {
        uri: uri,
        name: filename,
        type: type,
      });
      formData.append('empId', empId);
      
      const response = await axios.post(`${API_BASE}/profile/update-image`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      if (response.data.status === 'success') {
        setProfileImage(`${API_BASE}/profile/image/${empId}?t=${Date.now()}`);
        Alert.alert('Success', 'Profile picture updated!');
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  const showImageOptions = () => {
    Alert.alert(
      'Profile Picture',
      'Choose an option',
      [
        { text: '📷 Take Photo', onPress: takePhoto },
        { text: '🖼️ Choose from Gallery', onPress: pickImage },
        ...(profileImage ? [{ text: '🗑️ Delete Photo', onPress: deleteProfileImage, style: 'destructive' }] : []),
        { text: 'Cancel', style: 'cancel' },
      ],
      { cancelable: true }
    );
  };

  const handleUpdateProfile = async () => {
    try {
      let empId = user?.id;
      if (!empId) {
        const empData = await AsyncStorage.getItem('employeeData');
        if (empData) {
          empId = JSON.parse(empData).id;
        }
      }
      
      const updateData = {
        empId: empId,
        name: editData.name,
        email: editData.email,
        phone: editData.phone,
        address1: editData.address1,
        address2: editData.address2,
        talukName: editData.talukName,
        gender: editData.gender,
      };
      
      const response = await axios.post(`${API_BASE}/profile/update`, updateData);
      
      if (response.data.status === 'success') {
        Alert.alert('Success', 'Profile updated successfully!');
        setShowEditModal(false);
        loadEmployeeProfile();
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to update profile');
    }
  };

  const getGenderIcon = (gender) => {
    if (gender === 'M') return 'male-outline';
    if (gender === 'F') return 'female-outline';
    return 'person-outline';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2b78c5" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <StatusBar backgroundColor="#1976d2" barStyle="light-content" />
      
      {/* Profile Header - Left aligned with profile pic and details in one line */}
      <View style={styles.profileHeader}>
        <TouchableOpacity onPress={showImageOptions} style={styles.profileImageWrapper}>
          {uploadingImage ? (
            <View style={styles.profileImageSmall}>
              <ActivityIndicator size="small" color="#2b78c5" />
            </View>
          ) : profileImage ? (
            <Image source={{ uri: profileImage }} style={styles.profileImageSmall} />
          ) : (
            <View style={styles.profileImageSmall}>
              <Ionicons name="person" size={30} color="#2b78c5" />
            </View>
          )}
          <View style={styles.cameraIconSmall}>
            <Ionicons name="camera" size={10} color="#fff" />
          </View>
        </TouchableOpacity>
        
        <View style={styles.profileInfo}>
          <Text style={styles.profileNameHeader}>{employeeData?.name || 'Employee Name'}</Text>
          <Text style={styles.profileRoleHeader}>{employeeData?.role || 'Service Engineer'}</Text>
          <Text style={styles.profileIdHeader}>ID: {employeeData?.id || 'N/A'}</Text>
        </View>
        
        <TouchableOpacity style={styles.editIconBtn} onPress={() => setShowEditModal(true)}>
          <Ionicons name="create-outline" size={22} color="#2b78c5" />
        </TouchableOpacity>
      </View>

      {/* Profile Details Card */}
      <View style={styles.detailsCard}>
        <Text style={styles.cardTitle}>Profile Details</Text>
        
        <View style={styles.detailRow}>
          <View style={styles.detailIcon}>
            <Ionicons name="person-outline" size={18} color="#2b78c5" />
          </View>
          <View style={styles.detailContent}>
            <Text style={styles.detailLabel}>Full Name</Text>
            <Text style={styles.detailValue}>{employeeData?.name || 'Not set'}</Text>
          </View>
        </View>
        
        <View style={styles.detailRow}>
          <View style={styles.detailIcon}>
            <Ionicons name="mail-outline" size={18} color="#2b78c5" />
          </View>
          <View style={styles.detailContent}>
            <Text style={styles.detailLabel}>Email Address</Text>
            <Text style={styles.detailValue}>{employeeData?.email || 'Not set'}</Text>
          </View>
        </View>
        
        <View style={styles.detailRow}>
          <View style={styles.detailIcon}>
            <Ionicons name="call-outline" size={18} color="#2b78c5" />
          </View>
          <View style={styles.detailContent}>
            <Text style={styles.detailLabel}>Phone Number</Text>
            <Text style={styles.detailValue}>{employeeData?.phone || 'Not set'}</Text>
          </View>
        </View>
        
        <View style={styles.detailRow}>
          <View style={styles.detailIcon}>
            <Ionicons name="calendar-outline" size={18} color="#2b78c5" />
          </View>
          <View style={styles.detailContent}>
            <Text style={styles.detailLabel}>Date of Joining</Text>
            <Text style={styles.detailValue}>{employeeData?.joiningDate || 'Not set'}</Text>
          </View>
        </View>
        
        <View style={styles.detailRow}>
          <View style={styles.detailIcon}>
            {getGenderIcon(employeeData?.gender) === 'male-outline' ? (
              <Ionicons name="male-outline" size={18} color="#2b78c5" />
            ) : getGenderIcon(employeeData?.gender) === 'female-outline' ? (
              <Ionicons name="female-outline" size={18} color="#2b78c5" />
            ) : (
              <Ionicons name="person-outline" size={18} color="#2b78c5" />
            )}
          </View>
          <View style={styles.detailContent}>
            <Text style={styles.detailLabel}>Gender</Text>
            <Text style={styles.detailValue}>
              {employeeData?.gender === 'M' ? 'Male' : employeeData?.gender === 'F' ? 'Female' : 'Not set'}
            </Text>
          </View>
        </View>
      </View>

      {/* Address Card */}
      <View style={styles.detailsCard}>
        <Text style={styles.cardTitle}>Address Information</Text>
        
        <View style={styles.detailRow}>
          <View style={styles.detailIcon}>
            <Ionicons name="location-outline" size={18} color="#2b78c5" />
          </View>
          <View style={styles.detailContent}>
            <Text style={styles.detailLabel}>Street Address</Text>
            <Text style={styles.detailValue}>{employeeData?.address1 || 'Not set'}</Text>
          </View>
        </View>
        
        <View style={styles.detailRow}>
          <View style={styles.detailIcon}>
            <Ionicons name="location-outline" size={18} color="#2b78c5" />
          </View>
          <View style={styles.detailContent}>
            <Text style={styles.detailLabel}>Area</Text>
            <Text style={styles.detailValue}>{employeeData?.address2 || 'Not set'}</Text>
          </View>
        </View>
        
        <View style={styles.detailRow}>
          <View style={styles.detailIcon}>
            <Ionicons name="business-outline" size={18} color="#2b78c5" />
          </View>
          <View style={styles.detailContent}>
            <Text style={styles.detailLabel}>Taluk / City</Text>
            <Text style={styles.detailValue}>{employeeData?.talukName || 'Not set'}</Text>
          </View>
        </View>
        
        <View style={styles.detailRow}>
          <View style={styles.detailIcon}>
            <Ionicons name="flag-outline" size={18} color="#2b78c5" />
          </View>
          <View style={styles.detailContent}>
            <Text style={styles.detailLabel}>State</Text>
            <Text style={styles.detailValue}>{employeeData?.stateName || 'Not set'}</Text>
          </View>
        </View>
        
        <View style={styles.detailRow}>
          <View style={styles.detailIcon}>
            <Ionicons name="map-outline" size={18} color="#2b78c5" />
          </View>
          <View style={styles.detailContent}>
            <Text style={styles.detailLabel}>District</Text>
            <Text style={styles.detailValue}>{employeeData?.districtName || 'Not set'}</Text>
          </View>
        </View>
      </View>

      <View style={styles.footerSpace} />

      {/* Edit Profile Modal */}
      <Modal
        visible={showEditModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Full Name</Text>
                <TextInput
                  style={styles.input}
                  value={editData.name}
                  onChangeText={(text) => setEditData({ ...editData, name: text })}
                  placeholder="Enter your full name"
                  placeholderTextColor="#999"
                />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email Address</Text>
                <TextInput
                  style={styles.input}
                  value={editData.email}
                  onChangeText={(text) => setEditData({ ...editData, email: text })}
                  placeholder="Enter email address"
                  placeholderTextColor="#999"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Phone Number</Text>
                <TextInput
                  style={styles.input}
                  value={editData.phone}
                  onChangeText={(text) => setEditData({ ...editData, phone: text })}
                  placeholder="Enter phone number"
                  placeholderTextColor="#999"
                  keyboardType="phone-pad"
                />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Street Address</Text>
                <TextInput
                  style={styles.input}
                  value={editData.address1}
                  onChangeText={(text) => setEditData({ ...editData, address1: text })}
                  placeholder="Enter street address"
                  placeholderTextColor="#999"
                />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Area</Text>
                <TextInput
                  style={styles.input}
                  value={editData.address2}
                  onChangeText={(text) => setEditData({ ...editData, address2: text })}
                  placeholder="Enter area"
                  placeholderTextColor="#999"
                />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Taluk / City</Text>
                <TextInput
                  style={styles.input}
                  value={editData.talukName}
                  onChangeText={(text) => setEditData({ ...editData, talukName: text })}
                  placeholder="Enter taluk or city"
                  placeholderTextColor="#999"
                />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Gender</Text>
                <View style={styles.genderContainer}>
                  <TouchableOpacity 
                    style={[styles.genderOption, editData.gender === 'M' && styles.genderSelected]} 
                    onPress={() => setEditData({ ...editData, gender: 'M' })}
                  >
                    <Ionicons name="male-outline" size={20} color={editData.gender === 'M' ? '#2b78c5' : '#666'} />
                    <Text style={[styles.genderOptionText, editData.gender === 'M' && styles.genderSelectedText]}>Male</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.genderOption, editData.gender === 'F' && styles.genderSelected]} 
                    onPress={() => setEditData({ ...editData, gender: 'F' })}
                  >
                    <Ionicons name="female-outline" size={20} color={editData.gender === 'F' ? '#2b78c5' : '#666'} />
                    <Text style={[styles.genderOptionText, editData.gender === 'F' && styles.genderSelectedText]}>Female</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
            
            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setShowEditModal(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={handleUpdateProfile}>
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
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
    marginTop: 10,
    fontSize: 14,
    color: '#666',
  },
  // New Profile Header - Left aligned with profile pic
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e8eaed',
    gap: 12,
  },
  profileImageWrapper: {
    position: 'relative',
  },
  profileImageSmall: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E8F1FA',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#2b78c5',
  },
  cameraIconSmall: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#2b78c5',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  profileInfo: {
    flex: 1,
  },
  profileNameHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a237e',
    marginBottom: 2,
  },
  profileRoleHeader: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  profileIdHeader: {
    fontSize: 10,
    color: '#999',
  },
  editIconBtn: {
    padding: 8,
  },
  detailsCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 14,
    borderLeftWidth: 3,
    borderLeftColor: '#2b78c5',
    paddingLeft: 10,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  detailIcon: {
    width: 32,
    alignItems: 'center',
  },
  detailContent: {
    flex: 1,
    marginLeft: 8,
  },
  detailLabel: {
    fontSize: 11,
    color: '#999',
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    marginTop: 2,
  },
  footerSpace: {
    height: 30,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '90%',
    maxHeight: '85%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  modalBody: {
    padding: 16,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#555',
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#333',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  genderContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  genderOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    gap: 6,
  },
  genderSelected: {
    backgroundColor: '#E8F1FA',
    borderColor: '#2b78c5',
  },
  genderOptionText: {
    fontSize: 13,
    color: '#666',
  },
  genderSelectedText: {
    color: '#2b78c5',
    fontWeight: '500',
  },
  modalFooter: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 10,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: '500',
    fontSize: 13,
  },
  saveButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#2b78c5',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
});