import React from 'react';

/**
 * The base, non-generic FieldConfig type. This is what the array will hold.
 */
export interface FieldConfig {
  id: string;
  label: string;
  component: React.ComponentType<any>;
  props?: Record<string, any>;
  options?: { value: any; label: string }[]; // Added for select-like components
  getValueFromEvent?: (event: any) => any;
  customChangeHandler?: (
    event: any,
    context: { nodeId: string; updateNodeData: (id: string, data: object) => void },
  ) => void;
  formatValue?: (value: any) => any;
}

/**
 * A generic type representing the input for our creator function.
 * It links the component type `C` to its specific props.
 */
type FieldConfigCreator<C extends React.ComponentType<any>> = Omit<FieldConfig, 'props' | 'component'> & {
  component: C;
  props?: Partial<React.ComponentProps<C>>;
};

/**
 * A type-safe helper function to create field configurations.
 * It infers the props from the component, providing compile-time safety.
 * @param config The field configuration, with props validated against the component.
 * @returns A valid FieldConfig object.
 */
export function createFieldConfig<C extends React.ComponentType<any>>(config: FieldConfigCreator<C>): FieldConfig {
  return config;
}
