/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { Button, Icon, List } from 'semantic-ui-react';
import { Input } from '../../../lib/custom-ui';

import styles from './DropdownConfigEditor.module.scss';

const DropdownConfigEditor = ({ config, onChange }) => {
  const [t] = useTranslation();
  const options = config?.options || [];
  const [newOption, setNewOption] = useState('');

  const handleAddOption = useCallback(() => {
    if (!newOption.trim()) return;

    const updatedOptions = [...options, newOption.trim()];
    onChange({ ...config, options: updatedOptions });
    setNewOption('');
  }, [config, newOption, onChange, options]);

  const handleRemoveOption = useCallback(
    (index) => {
      const updatedOptions = options.filter((_, i) => i !== index);
      onChange({ ...config, options: updatedOptions });
    },
    [config, onChange, options],
  );

  const handleKeyPress = useCallback(
    (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleAddOption();
      }
    },
    [handleAddOption],
  );

  return (
    <div className={styles.wrapper}>
      <div className={styles.text}>{t('common.dropdown')} {t('common.options_title')}:</div>
      {options.length > 0 && (
        <List className={styles.list}>
          {options.map((option, index) => (
            <List.Item key={index} className={styles.listItem}>
              <span className={styles.optionText}>{option}</span>
              <Button
                icon
                size="mini"
                basic
                className={styles.removeButton}
                onClick={() => handleRemoveOption(index)}
              >
                <Icon name="trash" />
              </Button>
            </List.Item>
          ))}
        </List>
      )}
      <Input
        fluid
        placeholder={t('common.addOption')}
        value={newOption}
        onChange={(e) => setNewOption(e.target.value)}
        onKeyPress={handleKeyPress}
        className={styles.input}
        action={
          <Button icon onClick={handleAddOption} primary>
            <Icon name="plus" />
          </Button>
        }
      />
    </div>
  );
};

DropdownConfigEditor.propTypes = {
  config: PropTypes.object,
  onChange: PropTypes.func.isRequired,
};

DropdownConfigEditor.defaultProps = {
  config: undefined,
};

export default React.memo(DropdownConfigEditor);
