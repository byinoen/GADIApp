import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  Alert,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Modal,
  TextInput
} from 'react-native';
import { getSchedules, createSchedule } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

export default function WorkSchedulesScreen() {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    fecha: '',
    turno: 'Mañana (08:00-16:00)',
    empleado_id: '1'
  });
  const [submitting, setSubmitting] = useState(false);
  const { token, user } = useAuth();

  const TURNOS_OPTIONS = [
    'Mañana (08:00-16:00)',
    'Tarde (16:00-00:00)', 
    'Noche (00:00-08:00)'
  ];

  const EMPLEADOS_OPTIONS = [
    { id: 1, name: 'Juan Pérez' },
    { id: 2, name: 'María García' },
    { id: 3, name: 'Carlos López' },
    { id: 4, name: 'Ana Martínez' },
    { id: 5, name: 'Pedro Sánchez' }
  ];

  const loadSchedules = async () => {
    try {
      setLoading(true);
      const response = await getSchedules(token);
      setSchedules(response.schedules);
    } catch (error) {
      Alert.alert('Error', 'Error al cargar los horarios');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      const response = await getSchedules(token);
      setSchedules(response.schedules);
    } catch (error) {
      Alert.alert('Error', 'Error al cargar los horarios');
    } finally {
      setRefreshing(false);
    }
  };

  const handleCreateSchedule = async () => {
    if (!formData.fecha) {
      Alert.alert('Error', 'Por favor ingrese una fecha');
      return;
    }

    setSubmitting(true);
    try {
      await createSchedule(token, {
        fecha: formData.fecha,
        turno: formData.turno,
        empleado_id: parseInt(formData.empleado_id)
      });
      
      Alert.alert('Éxito', 'Turno añadido');
      setShowForm(false);
      setFormData({
        fecha: '',
        turno: 'Mañana (08:00-16:00)',
        empleado_id: '1'
      });
      loadSchedules(); // Refresh the list
    } catch (error) {
      Alert.alert('Error', 'Error al añadir turno');
    } finally {
      setSubmitting(false);
    }
  };

  const canCreateSchedules = user?.role === 'admin' || user?.role === 'encargado';

  useEffect(() => {
    if (token) {
      loadSchedules();
    }
  }, [token]);

  const renderScheduleItem = ({ item }) => (
    <View style={styles.scheduleItem}>
      <View style={styles.scheduleHeader}>
        <Text style={styles.date}>{formatDate(item.fecha)}</Text>
        <Text style={styles.shift}>{item.turno}</Text>
      </View>
      <Text style={styles.employee}>Empleado: {item.empleado}</Text>
    </View>
  );

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Cargando horarios...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.title}>Horarios de Trabajo</Text>
            <Text style={styles.subtitle}>
              {user?.role === 'trabajador' 
                ? 'Mis horarios asignados' 
                : 'Todos los horarios del equipo'}
            </Text>
          </View>
          
          {canCreateSchedules && (
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowForm(true)}
            >
              <Text style={styles.addButtonText}>Añadir turno</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {schedules.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No hay horarios disponibles</Text>
        </View>
      ) : (
        <FlatList
          data={schedules}
          renderItem={renderScheduleItem}
          keyExtractor={(item) => item.id.toString()}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={styles.listContainer}
        />
      )}

      <Modal
        visible={showForm}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowForm(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Añadir Nuevo Turno</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Fecha (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.textInput}
                value={formData.fecha}
                onChangeText={(text) => setFormData({...formData, fecha: text})}
                placeholder="2025-09-08"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Turno</Text>
              <View style={styles.pickerContainer}>
                {TURNOS_OPTIONS.map((turno) => (
                  <TouchableOpacity
                    key={turno}
                    style={[
                      styles.pickerOption,
                      formData.turno === turno && styles.pickerOptionSelected
                    ]}
                    onPress={() => setFormData({...formData, turno})}
                  >
                    <Text style={[
                      styles.pickerOptionText,
                      formData.turno === turno && styles.pickerOptionTextSelected
                    ]}>
                      {turno}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Empleado</Text>
              <View style={styles.pickerContainer}>
                {EMPLEADOS_OPTIONS.map((empleado) => (
                  <TouchableOpacity
                    key={empleado.id}
                    style={[
                      styles.pickerOption,
                      formData.empleado_id === empleado.id.toString() && styles.pickerOptionSelected
                    ]}
                    onPress={() => setFormData({...formData, empleado_id: empleado.id.toString()})}
                  >
                    <Text style={[
                      styles.pickerOptionText,
                      formData.empleado_id === empleado.id.toString() && styles.pickerOptionTextSelected
                    ]}>
                      {empleado.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowForm(false)}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.submitButton, submitting && styles.submitButtonDisabled]}
                onPress={handleCreateSchedule}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.submitButtonText}>Crear</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    backgroundColor: '#007AFF',
    padding: 20,
    paddingTop: 40,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#e6f2ff',
  },
  addButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 6,
  },
  addButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
  listContainer: {
    padding: 15,
  },
  scheduleItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  scheduleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  date: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  shift: {
    fontSize: 14,
    fontWeight: '500',
    color: '#007AFF',
    backgroundColor: '#e6f2ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  employee: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  pickerContainer: {
    gap: 8,
  },
  pickerOption: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#f9f9f9',
  },
  pickerOptionSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#e6f2ff',
  },
  pickerOptionText: {
    fontSize: 14,
    color: '#666',
  },
  pickerOptionTextSelected: {
    color: '#007AFF',
    fontWeight: '600',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#007AFF',
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});