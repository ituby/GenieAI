import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface UpdateAvailableModalProps {
  visible: boolean;
  onUpdate: () => void;
  onDismiss: () => void;
  updateInfo?: {
    version?: string;
    description?: string;
  };
}

export const UpdateAvailableModal: React.FC<UpdateAvailableModalProps> = ({
  visible,
  onUpdate,
  onDismiss,
  updateInfo,
}) => {
  const handleUpdate = () => {
    Alert.alert(
      'מעדכן את האפליקציה',
      'האפליקציה תיסגר ותיפתח מחדש עם העדכון החדש. האם להמשיך?',
      [
        {
          text: 'ביטול',
          style: 'cancel',
          onPress: onDismiss,
        },
        {
          text: 'עדכן עכשיו',
          style: 'default',
          onPress: onUpdate,
        },
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Ionicons name="cloud-download-outline" size={32} color="#4CAF50" />
            <Text style={styles.title}>עדכון זמין!</Text>
          </View>
          
          <Text style={styles.description}>
            יש עדכון חדש לאפליקציה עם שיפורים ותיקונים.
          </Text>
          
          {updateInfo?.version && (
            <Text style={styles.version}>
              גרסה: {updateInfo.version}
            </Text>
          )}
          
          {updateInfo?.description && (
            <Text style={styles.updateDescription}>
              {updateInfo.description}
            </Text>
          )}
          
          <View style={styles.buttons}>
            <TouchableOpacity
              style={styles.dismissButton}
              onPress={onDismiss}
            >
              <Text style={styles.dismissButtonText}>מאוחר יותר</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.updateButton}
              onPress={handleUpdate}
            >
              <Text style={styles.updateButtonText}>עדכן עכשיו</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 16,
  },
  version: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginBottom: 8,
  },
  updateDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 24,
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  dismissButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  dismissButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  updateButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
  },
  updateButtonText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
  },
});
