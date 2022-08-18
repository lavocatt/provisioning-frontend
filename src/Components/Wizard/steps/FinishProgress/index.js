import React from 'react';
import PropTypes from 'prop-types';
import {
  EmptyState,
  EmptyStateIcon,
  EmptyStateBody,
  EmptyStateSecondaryActions,
  Title,
  Progress,
  Button,
} from '@patternfly/react-core';
import { CogsIcon, OkIcon, ErrorCircleOIcon } from '@patternfly/react-icons';
import { useWizardContext } from '../../../Common/WizardContext';
import { useMutation } from 'react-query';
import { createAWSReservation, createNewPublicKey } from '../../../../API';
import './styles.scss';

const pf_success_color_100 = '#3E8635';
const pf_danger_color_100 = '#C9190B';

const FinishStep = ({ onClose, imageID }) => {
  const [
    {
      chosenSource,
      chosenInstanceType,
      chosenNumOfInstances,
      sshPublicName,
      sshPublicKey,
      chosenSshKeyId,
    },
  ] = useWizardContext();
  const [, setReservationID] = React.useState();
  const [activeStep, setActiveStep] = React.useState(chosenSshKeyId ? 1 : 0);
  const stepUp = () => setActiveStep((prevStep) => prevStep++);

  const { mutate: createAWSDeployment, error: awsReservationError } =
    useMutation(createAWSReservation, {
      onSuccess: (data) => {
        stepUp();
        setReservationID(data.reservation_id);
        // TODO: start polling for job status
      },
    });

  const { mutate: createPublicKey, error: pubkeyError } = useMutation(
    createNewPublicKey,
    {
      onSuccess: (resp) => {
        createAWSDeployment({
          source_id: chosenSource,
          instance_type: chosenInstanceType,
          amount: chosenNumOfInstances,
          image_id: imageID,
          pubkey_id: resp?.data?.id,
        });
        stepUp();
      },
    }
  );

  React.useEffect(() => {
    if (chosenSshKeyId) {
      createAWSDeployment({
        source_id: chosenSource,
        instance_type: chosenInstanceType,
        amount: chosenNumOfInstances,
        image_id: imageID,
        pubkey_id: chosenSshKeyId,
      });
    } else {
      createPublicKey({ name: sshPublicName, body: sshPublicKey });
    }
  }, []);

  const steps = [
    { description: 'Uploading SSH public key', progress: 0 },
    { description: 'Creating AWS reservation', progress: 20 },
    {
      description:
        'Waiting for AWS, it might take a few minutes, it is safe to close the wizard',
      progress: 60,
    },
    { description: 'Provisioning has been completed', progress: 100 },
  ];

  const activeProgress = steps[activeStep].progress;
  const isError = !!awsReservationError || !!pubkeyError;

  const iconGenerator = () => {
    if (isError) return ErrorCircleOIcon;
    return activeProgress === 100 ? OkIcon : CogsIcon;
  };

  const showCloseButton = () => {
    if (isError) return true;
    return activeStep >= 2;
  };

  const iconColor = () => {
    if (isError) return pf_danger_color_100;
    if (activeProgress === 100) return pf_success_color_100;
    return undefined;
  };

  return (
    <EmptyState variant="large">
      <EmptyStateIcon color={iconColor()} icon={iconGenerator()} />
      <Title headingLevel="h4" size="lg">
        {activeProgress === 100
          ? 'Provisioning has been finished successfully'
          : 'Provisioning in progress'}
      </Title>
      <EmptyStateBody>
        <Progress
          style={{ width: '500px' }}
          variant={isError && 'danger'}
          value={activeProgress}
          measureLocation="outside"
        />
      </EmptyStateBody>
      <EmptyStateBody>
        <span>
          {isError
            ? `An error has been occurred while ${steps[
                activeStep
              ].description.toLowerCase()}`
            : steps[activeStep].description}
          <br />
          <span className="status-error">
            {awsReservationError?.response?.data?.msg}
            {pubkeyError?.response?.data?.msg}
          </span>
        </span>
      </EmptyStateBody>
      <EmptyStateSecondaryActions>
        <Button
          variant="link"
          isDisabled={!showCloseButton()}
          onClick={onClose}
        >
          Close
        </Button>
      </EmptyStateSecondaryActions>
    </EmptyState>
  );
};

FinishStep.propTypes = {
  imageID: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default FinishStep;
