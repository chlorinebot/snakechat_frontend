import React from 'react';
import { Form, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import './UserForm.css';

interface SelectOption {
  value: string;
  label: string;
  selected?: boolean;
}

interface Field {
  name: string;
  label: string;
  type: string;
  placeholder: string;
  options?: SelectOption[];
  defaultValue?: string;
  icon?: string;
}

interface UserFormProps {
  title: string;
  subtitle: string;
  fields: Field[];
  onSubmit: (data: any) => void;
  error?: string;
  buttonText: string;
  footerText: string;
  footerLink: {
    text: string;
    to: string;
  };
  extraFields?: React.ReactNode;
  formLogo?: string;
}

const UserForm: React.FC<UserFormProps> = ({
  title,
  subtitle,
  fields,
  onSubmit,
  error,
  buttonText,
  footerText,
  footerLink,
  extraFields,
  formLogo,
}) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const data = Object.fromEntries(formData.entries());
    onSubmit(data);
  };

  const renderField = (field: Field) => {
    if (field.type === 'select' && field.options) {
      return (
        <div className="input-group">
          {field.icon && <span className="input-group-text auth-input-icon"><i className={field.icon} style={{color: "#000"}}></i></span>}
          <Form.Select
            name={field.name}
            required
            className="form-control auth-input"
            defaultValue={field.defaultValue}
            style={{color: '#000', fontWeight: '500', backgroundColor: '#fff'}}
          >
            {field.options.map((option) => (
              <option 
                key={option.value} 
                value={option.value}
                selected={option.selected}
                style={{color: '#000'}}
              >
                {option.label}
              </option>
            ))}
          </Form.Select>
        </div>
      );
    }

    return (
      <div className="input-group">
        {field.icon && <span className="input-group-text auth-input-icon"><i className={field.icon} style={{color: "#000"}}></i></span>}
        <Form.Control
          type={field.type}
          name={field.name}
          placeholder={field.placeholder}
          required
          className="auth-input"
          defaultValue={field.defaultValue}
          style={{color: '#000', fontWeight: '500', backgroundColor: '#fff'}}
        />
      </div>
    );
  };

  return (
    <div className="auth-form-container" style={{backgroundColor: '#fff'}}>
      {formLogo && (
        <div className="text-center mb-4">
          <img src={formLogo} alt="Logo" className="auth-logo" />
        </div>
      )}
      
      <Form onSubmit={handleSubmit} className="auth-form">
        {title && <h3 className="auth-title" style={{color: '#000', fontWeight: '700'}}>{title}</h3>}
        {subtitle && <p className="auth-subtitle" style={{color: '#333', fontWeight: '500'}}>{subtitle}</p>}
        {error && <div className="auth-error">{error}</div>}

        <div className="auth-fields">
          {fields.map((field) => (
            <Form.Group className="mb-4" key={field.name}>
              <Form.Label className="auth-label" style={{color: '#000', fontWeight: '700', fontSize: '16px'}}>{field.label}</Form.Label>
              {renderField(field)}
            </Form.Group>
          ))}
        </div>

        {extraFields && <div className="auth-extra-fields">{extraFields}</div>}

        <div className="d-grid gap-2 mt-4">
          <Button 
            type="submit" 
            variant="primary" 
            size="lg"
            className="auth-button"
          >
            {buttonText}
          </Button>
        </div>

        {footerText && footerLink.text && (
          <p className="auth-footer" style={{color: '#333', fontWeight: '500'}}>
            {footerText}{' '}
            <Link to={footerLink.to} className="auth-link" style={{fontWeight: '600'}}>
              {footerLink.text}
            </Link>
          </p>
        )}
      </Form>
    </div>
  );
};

export default UserForm; 