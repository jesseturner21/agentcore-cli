import {
  AgentCoreRegionSchema,
  AwsAccountIdSchema,
  type AwsDeploymentTarget,
  DeploymentTargetNameSchema,
} from '../../../../schema';
import { Cursor, Header, ScreenLayout } from '../../components';
import { Box, Text, useInput } from 'ink';
import React, { useState } from 'react';

const REGIONS = AgentCoreRegionSchema.options;

type FormField = 'name' | 'account' | 'region' | 'description';
const FORM_FIELDS: FormField[] = ['name', 'account', 'region', 'description'];

interface AddTargetScreenProps {
  existingTargetNames: string[];
  onComplete: (target: AwsDeploymentTarget) => void;
  onExit: () => void;
}

export function AddTargetScreen({ existingTargetNames, onComplete, onExit }: AddTargetScreenProps) {
  const [formField, setFormField] = useState<FormField>('name');
  const [formName, setFormName] = useState('');
  const [formAccount, setFormAccount] = useState('');
  const [formRegion, setFormRegion] = useState<string>('us-east-1');
  const [formDesc, setFormDesc] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [regionFilter, setRegionFilter] = useState('');

  const filteredRegions = regionFilter
    ? REGIONS.filter(r => r.toLowerCase().includes(regionFilter.toLowerCase()))
    : REGIONS;
  const currentRegionIndex = filteredRegions.indexOf(formRegion as (typeof REGIONS)[number]);

  const isAccountValid = formAccount.trim() ? AwsAccountIdSchema.safeParse(formAccount.trim()).success : false;

  useInput((input, key) => {
    if (key.escape) {
      onExit();
      return;
    }

    function moveToNextField(): void {
      const currentIdx = FORM_FIELDS.indexOf(formField);
      const nextIdx = (currentIdx + 1) % FORM_FIELDS.length;
      setFormField(FORM_FIELDS[nextIdx]!);
      setFormError(null);
      setRegionFilter('');
    }

    // Tab to next field (no validation)
    if (key.tab) {
      moveToNextField();
      return;
    }

    // Enter validates current field before moving to next
    if (key.return) {
      if (formField === 'name') {
        const nameResult = DeploymentTargetNameSchema.safeParse(formName.trim());
        if (!nameResult.success) {
          setFormError(nameResult.error.issues[0]?.message ?? 'Invalid name');
          return;
        }
        if (existingTargetNames.includes(formName.trim())) {
          setFormError('Target name already exists');
          return;
        }
        moveToNextField();
        return;
      }

      if (formField === 'account') {
        const accountResult = AwsAccountIdSchema.safeParse(formAccount.trim());
        if (!accountResult.success) {
          setFormError(accountResult.error.issues[0]?.message ?? 'Invalid account ID');
          return;
        }
        moveToNextField();
        return;
      }

      if (formField === 'region') {
        moveToNextField();
        return;
      }

      if (formField === 'description') {
        // Validate all fields before submit
        const nameResult = DeploymentTargetNameSchema.safeParse(formName.trim());
        if (!nameResult.success) {
          setFormError(nameResult.error.issues[0]?.message ?? 'Invalid name');
          setFormField('name');
          return;
        }

        if (existingTargetNames.includes(formName.trim())) {
          setFormError('Target name already exists');
          setFormField('name');
          return;
        }

        const accountResult = AwsAccountIdSchema.safeParse(formAccount.trim());
        if (!accountResult.success) {
          setFormError(accountResult.error.issues[0]?.message ?? 'Invalid account ID');
          setFormField('account');
          return;
        }

        const target: AwsDeploymentTarget = {
          name: formName.trim(),
          account: formAccount.trim(),
          region: formRegion as AwsDeploymentTarget['region'],
          ...(formDesc.trim() ? { description: formDesc.trim() } : {}),
        };

        onComplete(target);
        return;
      }
    }

    // Region: arrow keys + search
    if (formField === 'region') {
      if (key.upArrow || key.downArrow) {
        const currentIdx = filteredRegions.indexOf(formRegion as (typeof filteredRegions)[number]);
        const newIdx = key.upArrow
          ? (currentIdx - 1 + filteredRegions.length) % filteredRegions.length
          : (currentIdx + 1) % filteredRegions.length;
        if (filteredRegions[newIdx]) {
          setFormRegion(filteredRegions[newIdx]);
        }
        return;
      }
      // Allow typing to filter regions
      if (key.backspace || key.delete) {
        setRegionFilter(f => f.slice(0, -1));
        return;
      }
      if (input && !key.ctrl && !key.meta) {
        setRegionFilter(f => f + input);
        const newFiltered = REGIONS.filter(r => r.toLowerCase().includes((regionFilter + input).toLowerCase()));
        if (newFiltered[0]) {
          setFormRegion(newFiltered[0]);
        }
        return;
      }
    }

    // Text input for other fields
    if (formField !== 'region') {
      if (key.backspace || key.delete) {
        if (formField === 'name') setFormName(formName.slice(0, -1));
        else if (formField === 'account') setFormAccount(formAccount.slice(0, -1));
        else if (formField === 'description') setFormDesc(formDesc.slice(0, -1));
        setFormError(null);
        return;
      }
      if (input && !key.ctrl && !key.meta) {
        if (formField === 'name') setFormName(formName + input);
        else if (formField === 'account') setFormAccount(formAccount + input);
        else if (formField === 'description') setFormDesc(formDesc + input);
        setFormError(null);
      }
    }
  });

  return (
    <ScreenLayout onExit={onExit}>
      <Header title="Add Target" subtitle="AWS Deployment Target" />
      <Box flexDirection="column" gap={1}>
        <Text dimColor>Tab/Enter next field · ↑↓ region · Esc cancel</Text>

        <Box flexDirection="column" borderStyle="round" borderColor="cyan" paddingX={2} paddingY={1}>
          <FormRow label="Name" value={formName} placeholder="e.g. production" isActive={formField === 'name'} />
          <FormRow
            label="Account"
            value={formAccount}
            placeholder="123456789012"
            isActive={formField === 'account'}
            isValid={isAccountValid}
          />
          <FormRow
            label="Region"
            value={formRegion}
            isActive={formField === 'region'}
            regionInfo={{
              filter: regionFilter,
              index: currentRegionIndex >= 0 ? currentRegionIndex : 0,
              total: filteredRegions.length,
            }}
          />
          <FormRow
            label="Description"
            value={formDesc}
            placeholder="(optional)"
            isActive={formField === 'description'}
          />
        </Box>

        {formError && <Text color="red">{formError}</Text>}
      </Box>
    </ScreenLayout>
  );
}

function FormRow(props: {
  label: string;
  value: string;
  placeholder?: string;
  isActive: boolean;
  regionInfo?: { filter: string; index: number; total: number };
  isValid?: boolean;
}) {
  const { label, value, placeholder, isActive, regionInfo, isValid } = props;
  const hasInput = value.trim().length > 0;

  return (
    <Box flexDirection="row" gap={1}>
      <Box width={12}>
        <Text color={isActive ? 'cyan' : undefined} bold={isActive}>
          {label}:
        </Text>
      </Box>
      <Box>
        {isActive ? (
          regionInfo ? (
            <>
              <Text color="cyan">{value}</Text>
              <Text dimColor>
                {' '}
                ({regionInfo.index + 1}/{regionInfo.total})
              </Text>
              {regionInfo.filter && <Text dimColor> filter: &quot;{regionInfo.filter}&quot;</Text>}
              <Text dimColor> ↑↓ type to filter</Text>
            </>
          ) : (
            <>
              <Text color="cyan">{value}</Text>
              <Cursor />
              {hasInput && isValid && <Text color="green"> ✓</Text>}
            </>
          )
        ) : (
          <Text>{value || <Text dimColor>{placeholder}</Text>}</Text>
        )}
      </Box>
    </Box>
  );
}
