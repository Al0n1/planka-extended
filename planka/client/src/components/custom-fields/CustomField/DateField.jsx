import React, { useCallback, useState } from 'react';
import PropTypes from 'prop-types';
import { Input } from '../../../lib/custom-ui';

const DateField = ({ defaultValue, onUpdate, disabled }) => {
  const [value, setValue] = useState(defaultValue || '');

  const handleChange = useCallback((e) => {
    const newValue = e.target.value;
    setValue(newValue);
  }, []);

  const handleBlur = useCallback(() => {
    if (value) {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        onUpdate(value);
      } else {
        setValue(defaultValue || '');
      }
    } else {
      onUpdate('');
    }
  }, [value, defaultValue, onUpdate]);

  return (
    <Input
      fluid
      type="date"
      value={value}
      onChange={handleChange}
      onBlur={handleBlur}
      disabled={disabled}
    />
  );
};

DateField.propTypes = {
  defaultValue: PropTypes.string,
  onUpdate: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

export default React.memo(DateField);
