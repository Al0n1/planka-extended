import React, { useCallback, useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import { Checkbox, List, Button, Icon, Progress } from 'semantic-ui-react';
import { Input } from '../../../lib/custom-ui';
import { useTranslation } from 'react-i18next';

import styles from './ChecklistField.module.scss';

const ChecklistField = ({ defaultValue, onUpdate, disabled }) => {
  const [t] = useTranslation();
  
  const [items, setItems] = useState(() => {
    try {
      const parsed = JSON.parse(defaultValue || '{"items":[]}');
      return parsed.items || [];
    } catch {
      return [];
    }
  });
  
  const [newItemText, setNewItemText] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingText, setEditingText] = useState('');

  // Вычисляем прогресс
  const progress = useMemo(() => {
    if (items.length === 0) return 0;
    const checked = items.filter(item => item.checked).length;
    return Math.round((checked / items.length) * 100);
  }, [items]);

  const updateItems = useCallback((newItems) => {
    setItems(newItems);
    onUpdate(JSON.stringify({ items: newItems }));
  }, [onUpdate]);

  const handleToggle = useCallback((itemId) => {
    const updatedItems = items.map(item =>
      item.id === itemId ? { ...item, checked: !item.checked } : item
    );
    updateItems(updatedItems);
  }, [items, updateItems]);

  const handleAdd = useCallback(() => {
    if (!newItemText.trim()) return;
    
    const newItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      text: newItemText.trim(),
      checked: false,
      createdAt: new Date().toISOString(),
    };
    
    updateItems([...items, newItem]);
    setNewItemText('');
  }, [items, newItemText, updateItems]);

  const handleDelete = useCallback((itemId) => {
    const updatedItems = items.filter(item => item.id !== itemId);
    updateItems(updatedItems);
  }, [items, updateItems]);

  const handleStartEdit = useCallback((item) => {
    setEditingId(item.id);
    setEditingText(item.text);
  }, []);

  const handleSaveEdit = useCallback(() => {
    if (!editingText.trim()) {
      handleDelete(editingId);
    } else {
      const updatedItems = items.map(item =>
        item.id === editingId ? { ...item, text: editingText.trim() } : item
      );
      updateItems(updatedItems);
    }
    setEditingId(null);
    setEditingText('');
  }, [editingId, editingText, items, updateItems, handleDelete]);

  const handleCancelEdit = useCallback(() => {
    setEditingId(null);
    setEditingText('');
  }, []);

  return (
    <div className={styles.wrapper}>
      {items.length > 0 && (
        <Progress
          percent={progress}
          size="tiny"
          className={styles.progress}
          color={progress === 100 ? 'green' : 'blue'}
        >
          {progress}% ({items.filter(i => i.checked).length}/{items.length})
        </Progress>
      )}
      
      <List className={styles.list}>
        {items.map(item => (
          <List.Item key={item.id} className={styles.item}>
            {editingId === item.id ? (
              <div className={styles.editMode}>
                <Input
                  fluid
                  value={editingText}
                  onChange={(e) => setEditingText(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') handleSaveEdit();
                    if (e.key === 'Escape') handleCancelEdit();
                  }}
                  autoFocus
                />
                <Button.Group size="mini">
                  <Button icon positive onClick={handleSaveEdit}>
                    <Icon name="check" />
                  </Button>
                  <Button icon onClick={handleCancelEdit}>
                    <Icon name="times" />
                  </Button>
                </Button.Group>
              </div>
            ) : (
              <div className={styles.viewMode}>
                <Checkbox
                  label={item.text}
                  checked={item.checked}
                  onChange={() => handleToggle(item.id)}
                  disabled={disabled}
                  className={item.checked ? styles.checkedItem : ''}
                />
                {!disabled && (
                  <div className={styles.actions}>
                    <Button
                      icon
                      size="mini"
                      onClick={() => handleStartEdit(item)}
                      title={t('action.edit')}
                    >
                      <Icon name="pencil" />
                    </Button>
                    <Button
                      icon
                      size="mini"
                      onClick={() => handleDelete(item.id)}
                      title={t('action.delete')}
                    >
                      <Icon name="trash" />
                    </Button>
                  </div>
                )}
              </div>
            )}
          </List.Item>
        ))}
      </List>
      
      {!disabled && (
        <div className={styles.addItem}>
          <Input
            fluid
            placeholder={t('common.addItem')}
            value={newItemText}
            onChange={(e) => setNewItemText(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAdd()}
            action={
              <Button icon onClick={handleAdd} primary>
                <Icon name="plus" />
              </Button>
            }
          />
        </div>
      )}
    </div>
  );
};

ChecklistField.propTypes = {
  defaultValue: PropTypes.string,
  onUpdate: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

ChecklistField.defaultProps = {
  defaultValue: undefined,
  disabled: false,
};

export default ChecklistField;
