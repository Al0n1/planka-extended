import React, { useCallback, useState } from 'react';
import PropTypes from 'prop-types';
import { Input } from '../../../lib/custom-ui';

const NumberField = ({ defaultValue, onUpdate, disabled }) => {
  const [value, setValue] = useState(defaultValue || '');

  const handleChange = useCallback((e) => {
    const newValue = e.target.value;
    // Разрешаем только числа и точку/запятую
    if (newValue === '' || /^-?\d*[.,]?\d*$/.test(newValue)) {
      setValue(newValue);
    }
  }, []);

  const handleBlur = useCallback(() => {
    const numValue = value.replace(',', '.');
    if (numValue && !isNaN(parseFloat(numValue))) {
      onUpdate(numValue);
    } else if (value !== defaultValue) {
      setValue(defaultValue || '');
    }
  }, [value, defaultValue, onUpdate]);

  return (
    <Input
      fluid
      type="text"
      value={value}
      onChange={handleChange}
      onBlur={handleBlur}
      disabled={disabled}
      placeholder="Enter number..."
    />
  );
};

NumberField.propTypes = {
  defaultValue: PropTypes.string,
  onUpdate: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

export default React.memo(NumberField);
