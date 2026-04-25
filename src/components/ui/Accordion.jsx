import * as AccordionPrimitive from '@radix-ui/react-accordion';
import { ChevronDownIcon } from '@radix-ui/react-icons';
import * as React from 'react';

const Accordion = AccordionPrimitive.Root;

const AccordionItem = React.forwardRef(({ className = '', ...props }, ref) => (
  <AccordionPrimitive.Item
    ref={ref}
    className={`border-b ${className}`}
    style={{ borderColor: 'var(--border-subtle)' }}
    {...props}
  />
));
AccordionItem.displayName = 'AccordionItem';

const AccordionTrigger = React.forwardRef(({ className = '', children, ...props }, ref) => (
  <AccordionPrimitive.Header className="flex">
    <AccordionPrimitive.Trigger
      ref={ref}
      className={[
        'flex flex-1 items-center justify-start gap-3 py-3 text-left text-[15px] font-semibold leading-6',
        'transition-all hover:no-underline',
        '[&[data-state=open]>svg]:rotate-180',
        '[&>svg]:-order-1',
        className,
      ].join(' ')}
      style={{ color: 'var(--text-primary)' }}
      {...props}
    >
      {children}
      <ChevronDownIcon
        width={16}
        height={16}
        className="shrink-0 transition-transform duration-200"
        style={{ opacity: 0.5, color: 'var(--text-muted)' }}
        aria-hidden="true"
      />
    </AccordionPrimitive.Trigger>
  </AccordionPrimitive.Header>
));
AccordionTrigger.displayName = AccordionPrimitive.Trigger.displayName;

const AccordionContent = React.forwardRef(({ className = '', children, ...props }, ref) => (
  <AccordionPrimitive.Content
    ref={ref}
    className="overflow-hidden text-sm transition-all data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down"
    {...props}
  >
    <div className={`pb-4 pt-1 ps-7 ${className}`} style={{ color: 'var(--text-secondary)' }}>
      {children}
    </div>
  </AccordionPrimitive.Content>
));
AccordionContent.displayName = AccordionPrimitive.Content.displayName;

export { Accordion, AccordionContent, AccordionItem, AccordionTrigger };
