import React, { useState, useRef } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  Dimensions,
  I18nManager,
  Animated,
} from 'react-native';
import { Text } from '../Text';
import { Icon } from '../Icon';
import { useTheme } from '../../../theme';

export interface DropdownOption {
  value: string;
  label: string;
  icon?: string;
  color?: string;
}

interface DropdownProps {
  options: DropdownOption[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  style?: any;
  containerStyle?: any;
  label?: string;
}

export const Dropdown: React.FC<DropdownProps> = ({
  options,
  value,
  onValueChange,
  placeholder = 'Select an option',
  style,
  containerStyle,
  label,
}) => {
  const theme = useTheme();
  const [isVisible, setIsVisible] = useState(false);
  const [dropdownLayout, setDropdownLayout] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const dropdownRef = useRef<TouchableOpacity>(null);
  const arrowRotation = useRef(new Animated.Value(0)).current;
  
  const selectedOption = options.find(option => option.value === value);

  const handleSelect = (optionValue: string) => {
    onValueChange(optionValue);
    setIsVisible(false);
    // Animate arrow back
    Animated.timing(arrowRotation, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const handleToggle = () => {
    if (dropdownRef.current) {
      dropdownRef.current.measure((x, y, width, height, pageX, pageY) => {
        setDropdownLayout({ x: pageX, y: pageY + height, width, height });
        setIsVisible(!isVisible);
        
        // Animate arrow
        Animated.timing(arrowRotation, {
          toValue: isVisible ? 0 : 1,
          duration: 200,
          useNativeDriver: true,
        }).start();
      });
    }
  };

  const renderOption = ({ item }: { item: DropdownOption }) => (
    <TouchableOpacity
      style={[
        styles.option,
        {
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          borderBottomColor: 'rgba(255, 255, 255, 0.1)',
        },
        item.value === value && {
          backgroundColor: 'rgba(255, 255, 104, 0.15)',
          borderLeftWidth: 3,
          borderLeftColor: '#FFFF68',
        },
      ]}
      onPress={() => handleSelect(item.value)}
      activeOpacity={0.7}
    >
      <View style={[
        styles.optionContent,
        I18nManager.isRTL && styles.optionContentRTL
      ]}>
        {item.icon && (
          <View style={[
            styles.optionIcon,
            { backgroundColor: (item.color || '#FFFF68') + '20' }
          ]}>
            <Icon
              name={item.icon}
              size={16}
              color={item.color || '#FFFF68'}
              weight="fill"
            />
          </View>
        )}
        <Text
          variant="body"
          style={[
            styles.optionText,
            { 
              color: item.value === value ? '#FFFF68' : '#FFFFFF',
              fontWeight: item.value === value ? '600' : '500',
              textAlign: I18nManager.isRTL ? 'right' : 'left',
            },
          ]}
        >
          {item.label}
        </Text>
      </View>
      {item.value === value && (
        <Icon
          name="check"
          size={16}
          color="#FFFF68"
          weight="fill"
        />
      )}
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text variant="label" style={styles.label}>
          {label}
        </Text>
      )}
      <TouchableOpacity
        ref={dropdownRef}
        style={[
          styles.dropdown,
          {
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            borderColor: 'rgba(255, 255, 255, 0.8)',
          },
          style,
        ]}
        onPress={handleToggle}
        activeOpacity={0.7}
      >
        <View style={[
          styles.dropdownContent,
          I18nManager.isRTL && styles.dropdownContentRTL
        ]}>
          {selectedOption ? (
            <View style={[
              styles.selectedContent,
              I18nManager.isRTL && styles.selectedContentRTL
            ]}>
              {selectedOption.icon && (
                <View style={[
                  styles.selectedIcon,
                  { backgroundColor: (selectedOption.color || '#FFFF68') + '20' }
                ]}>
                  <Icon
                    name={selectedOption.icon}
                    size={16}
                    color={selectedOption.color || '#FFFF68'}
                    weight="fill"
                  />
                </View>
              )}
              <Text
                variant="body"
                style={[
                  styles.selectedText, 
                  { 
                    color: '#FFFFFF',
                    fontWeight: '600',
                    textAlign: I18nManager.isRTL ? 'right' : 'left',
                  }
                ]}
              >
                {selectedOption.label}
              </Text>
            </View>
          ) : (
            <Text
              variant="body"
              style={[
                styles.placeholderText, 
                { 
                  color: 'rgba(255, 255, 255, 0.5)',
                  textAlign: I18nManager.isRTL ? 'right' : 'left',
                }
              ]}
            >
              {placeholder}
            </Text>
          )}
        </View>
        <Animated.View
          style={{
            transform: [{
              rotate: arrowRotation.interpolate({
                inputRange: [0, 1],
                outputRange: ['0deg', '180deg'],
              }),
            }],
          }}
        >
          <Icon
            name="caret-down"
            size={18}
            color="rgba(255, 255, 255, 0.7)"
          />
        </Animated.View>
      </TouchableOpacity>

      <Modal
        visible={isVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setIsVisible(false);
          Animated.timing(arrowRotation, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }).start();
        }}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => {
            setIsVisible(false);
            Animated.timing(arrowRotation, {
              toValue: 0,
              duration: 200,
              useNativeDriver: true,
            }).start();
          }}
        >
          <View style={[
            styles.popupContent,
            {
              backgroundColor: 'rgba(0, 0, 0, 0.95)',
              top: dropdownLayout.y + 8, // Add padding above the dropdown
              left: dropdownLayout.x,
              width: dropdownLayout.width,
            }
          ]}>
            <FlatList
              data={options.sort((a, b) => {
                // Move 'custom' to the end
                if (a.value === 'custom') return 1;
                if (b.value === 'custom') return -1;
                return 0;
              })}
              renderItem={renderOption}
              keyExtractor={(item) => item.value}
              style={styles.optionsList}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled={true}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const { height: screenHeight } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  label: {
    marginBottom: 8,
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    minHeight: 44,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dropdownContent: {
    flex: 1,
  },
  dropdownContentRTL: {
    flexDirection: 'row-reverse',
  },
  selectedContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedContentRTL: {
    flexDirection: 'row-reverse',
  },
  selectedIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  selectedText: {
    fontSize: 14,
    fontWeight: '600',
  },
  placeholderText: {
    fontSize: 14,
    fontWeight: '400',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  popupContent: {
    position: 'absolute',
    maxHeight: 240,
    borderRadius: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  optionsList: {
    maxHeight: 220,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    minHeight: 48,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  optionContentRTL: {
    flexDirection: 'row-reverse',
  },
  optionIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  optionText: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
});
