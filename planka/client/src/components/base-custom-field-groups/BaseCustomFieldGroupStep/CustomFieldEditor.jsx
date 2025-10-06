/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useCallback, useEffect, useImperativeHandle } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import { Radio, Dropdown } from 'semantic-ui-react';
import { Input } from '../../../lib/custom-ui';

import { useNestedRef } from '../../../hooks';
import { CustomFieldTypes, CustomFieldTypeLabels, CustomFieldTypeIcons } from '../../../constants/CustomFieldTypes';
import DropdownConfigEditor from './DropdownConfigEditor';

import styles from './CustomFieldEditor.module.scss';

const CustomFieldEditor = React.forwardRef(({ data, onFieldChange }, ref) => {
  const [t] = useTranslation();

  const [nameFieldRef, handleNameFieldRef] = useNestedRef('inputRef');

  const selectNameField = useCallback(() => {
    nameFieldRef.current.select();
  }, [nameFieldRef]);

  useImperativeHandle(
    ref,
    () => ({
      selectNameField,
    }),
    [selectNameField],
  );

  useEffect(() => {
    nameFieldRef.current.focus();
  }, [nameFieldRef]);

  return (
    <>
      <div className={styles.text}>{t('common.title')}</div>
      <Input
        fluid
        ref={handleNameFieldRef}
        name="name"
        value={data.name}
        maxLength={128}
        className={styles.fieldName}
        onChange={onFieldChange}
      />
      <div className={styles.text}>{t('common.fieldType')}</div>
      <Dropdown
        fluid
        selection
        name="type"
        value={data.type || CustomFieldTypes.TEXT}
        options={Object.values(CustomFieldTypes).map((type) => ({
          key: type,
          value: type,
          text: t(CustomFieldTypeLabels[type]),
          icon: CustomFieldTypeIcons[type],
        }))}
        className={styles.field}
        onChange={(e, { value }) => onFieldChange(e, { name: 'type', value })}
      />
      {data.type === CustomFieldTypes.DROPDOWN && (
        <DropdownConfigEditor
          config={data.config}
          onChange={(config) => onFieldChange(null, { name: 'config', value: config })}
        />
      )}
      <Radio
        toggle
        name="showOnFrontOfCard"
        checked={data.showOnFrontOfCard}
        label={t('common.showOnFrontOfCard')}
        className={classNames(styles.field, styles.fieldRadio)}
        onChange={onFieldChange}
      />
    </>
  );
});

CustomFieldEditor.propTypes = {
  data: PropTypes.object.isRequired, // eslint-disable-line react/forbid-prop-types
  onFieldChange: PropTypes.func.isRequired,
};

export default React.memo(CustomFieldEditor);
